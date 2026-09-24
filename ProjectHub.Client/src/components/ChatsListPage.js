// projecthub.client/src/components/ChatsListPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Loader2, X } from 'lucide-react';
import { getChats } from '../services/chatsApi';
import UserAvatar from './UserAvatar';
import ChatCover from './ChatCover';
import '../styles/components/ChatsListPage.css';
import '../styles/components/ChatCover.css';

const ChatsListPage = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadChats();
    }, []);

    const loadChats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getChats();
            setChats(data || []);
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err);
            setError(err.message || 'Ошибка загрузки чатов');
        } finally {
            setLoading(false);
        }
    };

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

    // 🆕 Открыть чат.
    //    Полагаемся на то, что ProjectsPage уже сохранил activeTab='chats'
    //    в sessionStorage — при возврате через navigate(-1) таб восстановится сам.
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
                                                {chat.lastMessage
                                                    ? (chat.lastMessage.senderEmail === chat.otherUser?.email
                                                        ? ''
                                                        : 'Вы: ') + chat.lastMessage.text
                                                    : 'Нет сообщений'}
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