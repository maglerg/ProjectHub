// projecthub.client/src/services/signalrService.js

import * as signalR from '@microsoft/signalr';
import { getToken } from '../utils/storage';

const HUB_URL = 'https://localhost:7000/hubs/chat';

/**
 * Singleton-обёртка над SignalR-соединением.
 *
 * Использование:
 *   import { signalr } from '../services/signalrService';
 *
 *   await signalr.connect();           // подключиться
 *   signalr.on('ReceiveMessage', cb);  // подписаться
 *   signalr.off('ReceiveMessage', cb); // отписаться
 *   await signalr.invoke('JoinChat', chatId);
 *   await signalr.disconnect();        // отключиться
 */
class SignalRService {
    constructor() {
        this.connection = null;
        this._starting = null;   // Promise текущего старта — чтобы не было гонки
        this._listeners = new Map();  // eventName -> Set<handler>
        this._registeredHandlers = new Set();  // eventName, который уже подписан на connection
    }

    /** Ленивая инициализация connection (создаём один раз). */
    _ensureConnection() {
        if (this.connection) return this.connection;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                // JWT передаём через query string — единственный способ
                // для WebSocket в браузере.
                accessTokenFactory: () => getToken() || ''
            })
            .withAutomaticReconnect({
                // 0мс → 2с → 5с → 10с → 20с, дальше каждые 30с
                nextRetryDelayInMilliseconds: (retryContext) => {
                    const delays = [0, 2000, 5000, 10000, 20000];
                    if (retryContext.previousRetryCount < delays.length) {
                        return delays[retryContext.previousRetryCount];
                    }
                    return 30000;
                }
            })
            .configureLogging(
                process.env.NODE_ENV === 'development'
                    ? signalR.LogLevel.Information
                    : signalR.LogLevel.Warning
            )
            .build();

        // ── Реконнект: переподписаться на события ──
        this.connection.onreconnecting((error) => {
            console.warn('🔌 SignalR reconnecting...', error?.message);
            // Не сбрасываем _registeredHandlers — они остаются в _listeners,
            // при onreconnected заново зарегистрируем на новом connection.
            this._registeredHandlers.clear();
        });

        this.connection.onreconnected((connectionId) => {
            console.log('✅ SignalR reconnected', connectionId);
            // Перерегистрируем все обработчики
            this._reregisterHandlers();
            // Уведомляем подписчиков
            this._emitLocal('_reconnected');
        });

        this.connection.onclose((error) => {
            console.warn('❌ SignalR closed', error?.message);
            this._registeredHandlers.clear();
            this._emitLocal('_closed');
        });

        return this.connection;
    }

    /**
     * Подключиться (если ещё не подключены).
     * Возвращает Promise, безопасный для параллельных вызовов.
     */
    async connect() {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            return;
        }

        // Если уже идёт старт — ждём его
        if (this._starting) {
            return this._starting;
        }

        const conn = this._ensureConnection();

        this._starting = (async () => {
            try {
                if (conn.state === signalR.HubConnectionState.Disconnected) {
                    await conn.start();
                    console.log('✅ SignalR connected');
                    this._reregisterHandlers();
                }
            } catch (err) {
                console.error('❌ SignalR start error:', err);
                throw err;
            } finally {
                this._starting = null;
            }
        })();

        return this._starting;
    }

    /** Отключиться (при логауте). */
    async disconnect() {
        this._listeners.clear();
        this._registeredHandlers.clear();

        if (!this.connection) return;

        try {
            if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
                await this.connection.stop();
                console.log('🔌 SignalR disconnected');
            }
        } catch (err) {
            console.warn('SignalR stop error:', err);
        } finally {
            this.connection = null;
        }
    }

    /**
     * Подписаться на серверное событие.
     * Можно подписываться до connect() — обработчики сохраняются
     * в _listeners и будут зарегистрированы на connection'е при старте.
     */
    on(eventName, handler) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }
        this._listeners.get(eventName).add(handler);

        // Если connection уже создан — сразу регистрируем
        const conn = this.connection;
        if (conn && conn.state === signalR.HubConnectionState.Connected) {
            conn.on(eventName, handler);
            this._registeredHandlers.add(eventName);
        }
    }

    /** Отписаться. */
    off(eventName, handler) {
        const set = this._listeners.get(eventName);
        if (set) {
            set.delete(handler);
            if (set.size === 0) this._listeners.delete(eventName);
        }

        if (this.connection) {
            this.connection.off(eventName, handler);
        }
    }

    /**
     * Вызвать серверный метод хаба (например, JoinChat).
     * Безопасно: если не подключены — попробуем подключиться.
     */
    async invoke(methodName, ...args) {
        try {
            await this.connect();
            return await this.connection.invoke(methodName, ...args);
        } catch (err) {
            console.error(`❌ SignalR invoke ${methodName} error:`, err);
            throw err;
        }
    }

    // ── Внутренние хелперы ──

    /** Перерегистрирует все накопленные обработчики на текущем connection. */
    _reregisterHandlers() {
        if (!this.connection) return;

        for (const [eventName, handlers] of this._listeners) {
            for (const handler of handlers) {
                this.connection.off(eventName, handler);   // страховка от дублей
                this.connection.on(eventName, handler);
            }
        }
    }

    /** Эмитит локальное (не серверное) событие для подписчиков. */
    _emitLocal(eventName, ...args) {
        const set = this._listeners.get(eventName);
        if (!set) return;
        for (const handler of set) {
            try {
                handler(...args);
            } catch (err) {
                console.error(`Local handler error for ${eventName}:`, err);
            }
        }
    }

    /** Текущее состояние соединения (для отладки). */
    get state() {
        return this.connection?.state ?? 'Disconnected';
    }

    /** Пользователь онлайн по данным SignalR (не БД). */
    isConnected() {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

// Экспортируем singleton
export const signalr = new SignalRService();
export default signalr;