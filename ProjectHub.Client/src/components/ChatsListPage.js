// projecthub.client/src/components/ChatsListPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats } from '../services/chatsApi';
import '../styles/components/ChatsListPage.css';

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

    const getChatAvatar = (chat) => {
        if (chat.type === 'Personal' && chat.otherUser) {
            return chat.otherUser.name?.[0]?.toUpperCase() || '👤';
        }
        return '💬';
    };

    if (loading) {
        return (
            <div className="chats-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка чатов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chats-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    return (
        <div className="chats-list-page">
            <header className="chats-header">
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Назад
                </button>
                <h1>💬 Чаты</h1>
                <span className="chats-count">{chats.length}</span>
            </header>

            <div className="chats-content">
                {chats.length === 0 ? (
                    <div className="no-chats">
                        <div className="no-chats-icon">💬</div>
                        <h3>Нет чатов</h3>
                        <p>Начните общение с другом из профиля</p>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/projects')}
                        >
                            👥 Найти друзей
                        </button>
                    </div>
                ) : (
                    <div className="chats-list">
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                className={`chat-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                                onClick={() => navigate(`/chats/${chat.id}`)}
                            >
                                <div className="chat-item-avatar">
                                    {getChatAvatar(chat)}
                                    {chat.otherUser?.isOnline && (
                                        <div className="online-dot"></div>
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatsListPage;