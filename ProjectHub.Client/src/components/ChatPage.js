// projecthub.client/src/components/ChatPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChatById, getChatMessages, sendMessage } from '../services/chatsApi';
import '../styles/components/ChatPage.css';

const ChatPage = () => {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [chat, setChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 📌 Загрузка чата
    const loadChat = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const chatData = await getChatById(chatId);
            setChat(chatData);

            const messagesData = await getChatMessages(chatId);
            setMessages(messagesData);

            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Ошибка загрузки чата:', err);
            setError(err.message || 'Не удалось загрузить чат');
        } finally {
            setLoading(false);
        }
    }, [chatId]);

    useEffect(() => {
        loadChat();
    }, [loadChat]);

    // 📌 Периодическое обновление — учитываем isReadByAll
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const messagesData = await getChatMessages(chatId);
                setMessages(prev => {
                    const changed =
                        messagesData.length !== prev.length ||
                        messagesData.some((m, i) =>
                            m.id !== prev[i]?.id ||
                            m.isRead !== prev[i]?.isRead ||
                            m.isReadByAll !== prev[i]?.isReadByAll
                        );

                    if (changed) {
                        setTimeout(scrollToBottom, 100);
                        return messagesData;
                    }
                    return prev;
                });
            } catch (err) {
                console.warn('Не удалось обновить сообщения:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [chatId]);

    // 📌 Отправка
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const textToSend = newMessage.trim();
        setNewMessage('');

        try {
            const sentMessage = await sendMessage(chatId, textToSend);
            setMessages(prev => [...prev, sentMessage]);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Ошибка отправки:', err);
            setError(err.message || 'Не удалось отправить сообщение');
            setNewMessage(textToSend);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    // 📌 Форматирование времени
    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = date.toDateString() === yesterday.toDateString();

            if (isToday) {
                return date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit', minute: '2-digit'
                });
            }
            if (isYesterday) {
                return `Вчера, ${date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit', minute: '2-digit'
                })}`;
            }
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    const isOwnMessage = (message) => message.senderEmail === user?.email;

    // 📌 Читаемое название роли
    const getRoleName = (role) => {
        switch (role) {
            case 'Owner': return 'Владелец';
            case 'Admin': return 'Админ';
            case 'Member': return 'Участник';
            default: return role || '';
        }
    };

    // 📌 Заголовок чата
    const getChatTitle = () => {
        if (chat?.type === 'Personal' && chat?.otherUser)
            return chat.otherUser.name;
        if (chat?.type === 'Project')
            return chat.name || 'Чат проекта';
        return chat?.name || 'Чат';
    };

    if (loading) {
        return (
            <div className="chat-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка чата...</p>
            </div>
        );
    }

    if (error && !chat) {
        return (
            <div className="chat-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/chats')}>
                    ← Вернуться к чатам
                </button>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <header className="chat-header">
                <button className="btn-back" onClick={() => navigate('/chats')}>
                    ← Назад
                </button>

                <div className="chat-header-user">
                    {/* Личный чат */}
                    {chat?.type === 'Personal' && chat?.otherUser && (
                        <>
                            <div className="chat-header-avatar">
                                {chat.otherUser.name?.[0]?.toUpperCase() || '👤'}
                            </div>
                            <div className="chat-header-info">
                                <div className="chat-header-name">{getChatTitle()}</div>
                                <div className={`chat-header-status ${chat.otherUser.isOnline ? 'online' : 'offline'}`}>
                                    {chat.otherUser.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Групповой чат проекта */}
                    {chat?.type === 'Project' && (
                        <>
                            <div className="chat-header-avatar">👥</div>
                            <div className="chat-header-info">
                                <div className="chat-header-name">{getChatTitle()}</div>
                                <div className="chat-header-status">
                                    👥 {chat.participantsCount || 0} участников
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="chat-header-actions">
                    {chat?.otherUser && (
                        <button
                            className="btn-view-profile"
                            onClick={() => {
                                const encodedEmail = encodeURIComponent(chat.otherUser.email);
                                navigate(`/users/${encodedEmail}`);
                            }}
                            title="Профиль"
                        >
                            👤
                        </button>
                    )}
                </div>
            </header>

            {/* 📌 Сообщения */}
            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">💬</div>
                        <h3>Нет сообщений</h3>
                        <p>Начните общение первым!</p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const isOwn = isOwnMessage(message);
                        const isProjectChat = chat?.type === 'Project';

                        const showSenderName = !isOwn && (
                            index === 0 ||
                            messages[index - 1]?.senderId !== message.senderId
                        );

                        // 📌 Для группового — «прочитали все»; для личного — isRead
                        const isReadAll = isProjectChat
                            ? message.isReadByAll
                            : message.isRead;

                        return (
                            <div
                                key={message.id || index}
                                className={`chat-message ${isOwn ? 'own' : 'other'}`}
                            >
                                {/* 📌 Ник + роль над сообщением */}
                                {!isOwn && showSenderName && (
                                    <div className="message-sender-name">
                                        <span className="sender-name-text">
                                            {message.senderName}
                                        </span>
                                        {isProjectChat && message.senderRole && (
                                            <span className={`sender-role role-${message.senderRole.toLowerCase()}`}>
                                                {getRoleName(message.senderRole)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="message-bubble-wrapper">
                                    <div className="message-bubble">
                                        <div className="message-text">{message.text}</div>
                                        {/* 📌 Время под текстом */}
                                        <div className="message-time">
                                            {formatTime(message.createdAt)}
                                        </div>
                                    </div>

                                    {/* 📌 Точка — пока не прочитали все */}
                                    {isOwn && !isReadAll && (
                                        <span
                                            className="message-unread-dot"
                                            title={
                                                isProjectChat
                                                    ? `Прочитали: ${message.readCount}/${message.totalParticipants}`
                                                    : 'Не прочитано'
                                            }
                                        />
                                    )}

                                    {/* 📌 Галочка — когда прочитали все */}
                                    {isOwn && isReadAll && (
                                        <span
                                            className="message-read-check"
                                            title={
                                                isProjectChat
                                                    ? `Прочитали все (${message.readCount}/${message.totalParticipants})`
                                                    : 'Прочитано'
                                            }
                                        >
                                            ✓✓
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 📌 Поле ввода */}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <textarea
                    className="chat-input"
                    placeholder="Введите сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows="1"
                    disabled={sending}
                />
                <button
                    type="submit"
                    className="btn-send"
                    disabled={!newMessage.trim() || sending}
                    title="Отправить"
                >
                    {sending ? '⏳' : '📤'}
                </button>
            </form>
        </div>
    );
};

export default ChatPage;