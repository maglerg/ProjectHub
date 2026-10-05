// projecthub.client/src/context/AuthContext.js

import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    getCurrentUser,
    isAuthenticated,
    getUserFromStorage,
} from '../api/authApi';
import { signalr } from '../services/signalrService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Ref, чтобы обработчики useEffect видели актуальное значение user
    const userRef = useRef(null);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // ═══════════════════════════════════════════════════════════
    //  ХЕЛПЕРЫ (объявлены ДО их использования)
    // ═══════════════════════════════════════════════════════════

    // Пишем пользователя в localStorage.
    // useCallback([]) — функция стабильна навсегда.
    const persistUser = useCallback((nextUser) => {
        try {
            if (nextUser) {
                localStorage.setItem('user', JSON.stringify(nextUser));
            } else {
                localStorage.removeItem('user');
            }
        } catch (e) {
            console.warn('Не удалось сохранить пользователя в localStorage:', e);
        }
    }, []);

    // Публичный сеттер пользователя.
    // Зависит только от persistUser (который стабилен) — значит,
    // setUser тоже стабилен между рендерами.
    const setUser = useCallback((nextUser) => {
        setUserState(nextUser);
        persistUser(nextUser);
    }, [persistUser]);

    // Подключение SignalR без блокировки UI.
    // Ошибка подключения не критична — REST всё ещё работает.
    const connectSignalR = useCallback(async () => {
        try {
            await signalr.connect();
        } catch (err) {
            console.warn('⚠️ SignalR initial connect failed:', err?.message);
        }
    }, []);

    // Загрузка пользователя при старте.
    // Зависим только от стабильных функций — сам useCallback
    // не будет пересоздаваться без необходимости.
    const loadUser = useCallback(async () => {
        setLoading(true);
        try {
            if (isAuthenticated()) {
                const userData = await getCurrentUser();
                if (userData) {
                    setUserState(userData);
                    persistUser(userData);
                    connectSignalR();
                } else {
                    setUserState(null);
                }
            } else {
                const storedUser = getUserFromStorage();
                if (storedUser) {
                    try {
                        const refreshedUser = await getCurrentUser();
                        const next = refreshedUser || storedUser;
                        setUserState(next);
                        persistUser(next);
                        connectSignalR();
                    } catch {
                        setUserState(storedUser);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading user:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [persistUser, connectSignalR]);

    // ═══════════════════════════════════════════════════════════
    //  EFFECTS
    // ═══════════════════════════════════════════════════════════

    // Загружаем пользователя один раз при монтировании.
    // loadUser стабилен → этот эффект сработает ровно один раз.
    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // При размонтировании провайдера — отключаем SignalR
    useEffect(() => {
        return () => {
            signalr.disconnect().catch(() => { });
        };
    }, []);

    // ═══════════════════════════════════════════════════════════
    //  ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════

    // Вход
    const handleLogin = useCallback(async (email, password) => {
        setError(null);
        try {
            const userData = await apiLogin(email, password);
            setUser(userData);

            // После успешного логина — подключаем SignalR
            connectSignalR();

            return userData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [setUser, connectSignalR]);

    // Регистрация
    const handleRegister = useCallback(async (userData) => {
        setError(null);
        try {
            const data = await apiRegister(userData);
            setUser(data);

            // После успешной регистрации — подключаем SignalR
            connectSignalR();

            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [setUser, connectSignalR]);

    // Выход
    const handleLogout = useCallback(async () => {
        // Сначала отключаем SignalR, потом чистим токен
        try {
            await signalr.disconnect();
        } catch (err) {
            console.warn('SignalR disconnect error:', err);
        }

        try {
            await apiLogout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
        }
    }, [setUser]);

    // ═══════════════════════════════════════════════════════════
    //  CONTEXT VALUE
    // ═══════════════════════════════════════════════════════════

    const value = {
        user,
        loading,
        error,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        isAuthenticated: !!user && isAuthenticated(),
        setUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};