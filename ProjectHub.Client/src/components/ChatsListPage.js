// projecthub.client/src/components/ChatsListPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2, X } from 'lucide-react';
import { getChats } from '../services/chatsApi';
import { signalr } from '../services/signalrService';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import ChatCover from './ChatCover';
import '../styles/components/ChatsListPage.css';
import '../styles/components/ChatCover.css';

const ChatsListPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🆕 Ref, чтобы обработчики SignalR видели актуальный email без пересоздания подписок
    const userEmailRef = useRef(user?.email);
    useEffect(() => { userEmailRef.current = user?.email; }, [user?.email]);

    // ── Загрузка чатов ──
    const loadChats = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const data = await getChats();
            setChats(data || []);
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err);
            if (!silent) setError(err.message || 'Ошибка загрузки чатов');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: подписки на события
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        // ── Новое сообщение ──
        const handleReceiveMessage = (message) => {
            if (!message) return;

            setChats((prev) => {
                const idx = prev.findIndex((c) => c.id === message.chatId);

                // Чат, которого нет в списке (например, новый личный чат) —
                // подгружаем список целиком.
                if (idx === -1) {
                    loadChats(true);
                    return prev;
                }

                const updated = [...prev];
                const chat = updated[idx];

                // Обновляем последнее сообщение и время
                chat.lastMessage = message;
                chat.lastMessageAt = message.createdAt;

                // Счётчик непрочитанных приходит отдельным событием UnreadCountChanged,
                // здесь не трогаем — иначе будет двойной инкремент.
                // Но поднимем чат вверх списка, чтобы UX был как в Telegram.
                updated.splice(idx, 1);
                updated.unshift(chat);

                return updated;
            });
        };

        // ── Счётчик непрочитанных изменился ──
        const handleUnreadCountChanged = (chatId, unreadCount) => {
            setChats((prev) =>
                prev.map((c) =>
                    c.id === chatId
                        ? { ...c, unreadCount }
                        : c
                )
            );
        };

        // ── Пользователь зашёл в сеть ──
        // (userId — Guid строкой. В ChatListDto у нас есть только email собеседника,
        //  поэтому точное сопоставление невозможно без доп. поля. На всякий случай
        //  перезапрашиваем список, чтобы подтянуть актуальный isOnline.)
        const handleUserOnline = () => {
            loadChats(true);
        };

        // ── Пользователь ушёл в оффлайн ──
        const handleUserOffline = () => {
            loadChats(true);
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing chats…');
            loadChats(true);
        };

        signalr.on('ReceiveMessage', handleReceiveMessage);
        signalr.on('UnreadCountChanged', handleUnreadCountChanged);
        signalr.on('UserOnline', handleUserOnline);
        signalr.on('UserOffline', handleUserOffline);
        signalr.on('_reconnected', handleReconnected);

        // На случай, если SignalR ещё не подключён — инициируем
        signalr.connect().catch((err) => {
            console.warn('SignalR connect from ChatsListPage failed:', err);
        });

        return () => {
            signalr.off('ReceiveMessage', handleReceiveMessage);
            signalr.off('UnreadCountChanged', handleUnreadCountChanged);
            signalr.off('UserOnline', handleUserOnline);
            signalr.off('UserOffline', handleUserOffline);
            signalr.off('_reconnected', handleReconnected);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);

            if (diff < 60) return 'только что';
            if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;

            const isToday = date.toDateString() === now.toDateString();
            if (isToday) {
                return date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit'
            });
        } catch {
            return '';
        }
    };

    const getChatTitle = (chat) => {
        if (chat.type === 'Personal' && chat.otherUser) {
            return chat.otherUser.name;
        }
        return chat.name || 'Чат';
    };

    // Превью последнего сообщения
    const getLastMessagePreview = (chat) => {
        if (!chat.lastMessage) return 'Нет сообщений';

        const isOwn =
            chat.lastMessage.senderEmail?.toLowerCase() ===
            userEmailRef.current?.toLowerCase();

        // Если это вложение и нет текста — показываем имя файла
        let text = chat.lastMessage.text;
        if (!text && chat.lastMessage.attachmentFileName) {
            text = `📎 ${chat.lastMessage.attachmentFileName}`;
        }
        if (!text) text = 'Вложение';

        return isOwn ? `Вы: ${text}` : text;
    };

    const openChat = (chatId) => {
        navigate(`/chats/${chatId}`);
    };

    if (loading) {
        return (
            <div className="chats-loading">
                <div className="spinner">
                    <Loader2 size={32} className="icon-spin" />
                </div>
                <p>Загрузка чатов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chats-error">
                <div className="error-icon">
                    <X size={32} />
                </div>
                <h3>Ошибка</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="chats-list-page">
            <div className="chats-content">
                {chats.length === 0 ? (
                    <div className="no-chats">
                        <div className="no-chats-icon">
                            <MessageCircle size={48} />
                        </div>
                        <h3>Нет чатов</h3>
                        <p>Начните общение с другом из профиля</p>
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => navigate('/projects')}
                        >
                            Найти друзей
                        </button>
                    </div>
                ) : (
                    <div className="chats-list">
                        {chats.map(chat => {
                            const isPersonal = chat.type === 'Personal';
                            const otherUser = chat.otherUser;

                            return (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                                    onClick={() => openChat(chat.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openChat(chat.id);
                                        }
                                    }}
                                >
                                    <div className="chat-item-avatar-wrapper">
                                        {isPersonal && otherUser ? (
                                            <UserAvatar
                                                avatarUrl={otherUser.avatarUrl}
                                                name={otherUser.name}
                                                email={otherUser.email}
                                                size="md"
                                            />
                                        ) : (
                                            <div className="chat-item-cover">
                                                <ChatCover chat={chat} size="md" />
                                            </div>
                                        )}

                                        {otherUser?.isOnline && (
                                            <div className="online-dot" />
                                        )}
                                    </div>

                                    <div className="chat-item-content">
                                        <div className="chat-item-header">
                                            <span className="chat-item-name">
                                                {getChatTitle(chat)}
                                            </span>
                                            <span className="chat-item-time">
                                                {formatTime(chat.lastMessageAt)}
                                            </span>
                                        </div>
                                        <div className="chat-item-footer">
                                            <span className="chat-item-last-message">
                                                {getLastMessagePreview(chat)}
                                            </span>
                                            {chat.unreadCount > 0 && (
                                                <span className="chat-item-badge">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatsListPage;