// projecthub.client/src/components/ChatPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getChatById,
    getChatMessages,
    sendMessage,
    sendChatFile,
    downloadChatFile,
} from '../services/chatsApi';
import { toAbsoluteUrl } from '../utils/urls';
import { formatBytes } from '../utils/formatBytes';
import UserAvatar from './UserAvatar';
import ChatCover from './ChatCover';
import EmojiPicker from './EmojiPicker';
import '../styles/components/ChatPage.css';
import '../styles/components/ChatCover.css';
import '../styles/components/EmojiPicker.css';

const ChatPage = ({
    chatId: chatIdProp = null,
    embedded = false,
    isArchived = false,
    refreshKey = 0,
}) => {
    const params = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const chatId = chatIdProp || params.chatId;

    const [chat, setChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    const [firstUnreadId, setFirstUnreadId] = useState(null);

    const [attachedFile, setAttachedFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiButtonRef = useRef(null);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const messageRefs = useRef(new Map());
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToFirstUnread = (unreadId) => {
        const el = messageRefs.current.get(unreadId);
        if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else {
            scrollToBottom();
        }
    };

    // ── Загрузка чата ──
    const loadChat = useCallback(async () => {
        if (!chatId) return;

        setLoading(true);
        setError(null);

        try {
            const chatData = await getChatById(chatId);
            setChat(chatData);

            const messagesData = await getChatMessages(chatId);
            setMessages(messagesData);

            const firstUnread = messagesData.find((m) => m.isUnread);

            if (firstUnread) {
                setFirstUnreadId(firstUnread.id);
                setTimeout(() => scrollToFirstUnread(firstUnread.id), 150);
            } else {
                setFirstUnreadId(null);
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            console.error('Ошибка загрузки чата:', err);
            setError(err.message || 'Не удалось загрузить чат');
        } finally {
            setLoading(false);
        }
    }, [chatId]);

    useEffect(() => {
        loadChat();
    }, [loadChat, refreshKey]);

    // ── Периодическое обновление ──
    useEffect(() => {
        if (!chatId) return;

        const interval = setInterval(async () => {
            try {
                const messagesData = await getChatMessages(chatId);
                setMessages((prev) => {
                    const changed =
                        messagesData.length !== prev.length ||
                        messagesData.some(
                            (m, i) =>
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

    // ═══════════════════════════════════════════════════════════
    //  🆕 АВТОФОКУС: пользователь печатает — фокус в поле ввода
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        // В архивном чате нет формы ввода — ничего не делаем
        if (isArchived) return;
        if (!chatId) return;

        const handleGlobalKeyDown = (e) => {
            const active = document.activeElement;

            // Если фокус уже в поле ввода/текстареа — не мешаем
            const isInInput =
                active &&
                (active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.isContentEditable);

            // Если открыта модалка / панель эмодзи — не перехватываем
            const isInsideOverlay =
                active &&
                active.closest(
                    '[role="dialog"], .emoji-picker, .modal-overlay, .edit-modal-overlay'
                );

            // Служебные и модифицирующие клавиши игнорируем
            if (
                e.ctrlKey ||
                e.metaKey ||
                e.altKey ||
                e.key === 'Tab' ||
                e.key === 'Escape' ||
                e.key === 'Enter' ||
                e.key === 'Shift' ||
                e.key === 'Control' ||
                e.key === 'Alt' ||
                e.key === 'Meta' ||
                e.key === 'CapsLock' ||
                /^F\d{1,2}$/.test(e.key)
            ) {
                return;
            }

            const isPrintable = e.key.length === 1;
            const isBackspace = e.key === 'Backspace';
            const isDelete = e.key === 'Delete';

            if (!isPrintable && !isBackspace && !isDelete) return;
            if (isInInput || isInsideOverlay) return;

            // 🆕 Переводим фокус в поле ввода
            textareaRef.current?.focus();

            // 🆕 Печатаемый символ дописываем вручную, чтобы не потерялся
            //    (после смены фокуса браузер может не вставить его сам)
            if (isPrintable) {
                setNewMessage((prev) => prev + e.key);
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [chatId, isArchived]);

    // ── Отправка текста или файла ──
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();

        if (isArchived) return;
        if (sending || uploadingFile) return;

        // Если есть прикреплённый файл — отправляем файл
        if (attachedFile) {
            await handleSendFile();
            return;
        }

        // Пустое сообщение не отправляем
        if (!newMessage.trim()) return;

        setSending(true);
        const textToSend = newMessage.trim();
        setNewMessage('');
        setShowEmojiPicker(false);

        try {
            const sentMessage = await sendMessage(chatId, textToSend);
            setMessages((prev) => [...prev, sentMessage]);

            setFirstUnreadId(null);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Ошибка отправки:', err);
            setError(err.message || 'Не удалось отправить сообщение');
            setNewMessage(textToSend);
        } finally {
            setSending(false);
        }
    };

    // ── Выбор файла ──
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            setError('Файл больше 20 МБ');
            setTimeout(() => setError(null), 3000);
            e.target.value = '';
            return;
        }

        setAttachedFile(file);
        setShowEmojiPicker(false);
    };

    // ── Отправка файла ──
    const handleSendFile = async () => {
        if (!attachedFile || uploadingFile) return;
        if (isArchived) return;

        setUploadingFile(true);
        setError(null);

        const fileToSend = attachedFile;
        const caption = newMessage.trim() || null;

        try {
            const sentMessage = await sendChatFile(chatId, fileToSend, caption);

            setMessages((prev) => [...prev, sentMessage]);
            setAttachedFile(null);
            setNewMessage('');
            if (fileInputRef.current) fileInputRef.current.value = '';

            setFirstUnreadId(null);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Ошибка отправки файла:', err);
            setError(err.message || 'Не удалось отправить файл');
            setTimeout(() => setError(null), 4000);
        } finally {
            setUploadingFile(false);
        }
    };

    // ── Убрать выбранный файл ──
    const handleClearAttachedFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Скачать файл из сообщения ──
    const handleDownloadFile = async (message) => {
        try {
            await downloadChatFile(
                chatId,
                message.id,
                message.attachmentFileName || 'file'
            );
        } catch (err) {
            console.error('Ошибка скачивания:', err);
            setError(err.message || 'Не удалось скачать файл');
            setTimeout(() => setError(null), 3000);
        }
    };

    // ── Выбор эмодзи ──
    const handleEmojiSelect = (emoji) => {
        setNewMessage((prev) => prev + emoji);
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker((v) => !v);
    };

    // ── Enter — отправить, Shift+Enter — новая строка ──
    const handleKeyDown = (e) => {
        if (isArchived) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            const hasText = newMessage.trim().length > 0;
            const hasFile = !!attachedFile;

            if (!hasText && !hasFile) return;
            if (sending || uploadingFile) return;

            handleSendMessage(e);
        }
    };

    // ── Формат времени ──
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

    const getRoleName = (role) => {
        switch (role) {
            case 'Owner': return 'Владелец';
            case 'Admin': return 'Админ';
            case 'Member': return 'Участник';
            default: return role || '';
        }
    };

    const getChatTitle = () => {
        if (chat?.type === 'Personal' && chat?.otherUser)
            return chat.otherUser.name;
        if (chat?.type === 'Project')
            return chat.name || 'Чат проекта';
        return chat?.name || 'Чат';
    };

    const goToOtherUserProfile = () => {
        if (!chat?.otherUser?.email) return;
        const encodedEmail = encodeURIComponent(chat.otherUser.email);
        navigate(`/users/${encodedEmail}`);
    };

    const goBackToChats = () => {
        navigate('/chats');
    };

    if (loading) {
        return (
            <div className={embedded ? 'chat-page chat-page--embedded' : 'chat-page'}>
                <div className="chat-loading">
                    <div className="spinner">⏳</div>
                    <p>Загрузка чата...</p>
                </div>
            </div>
        );
    }

    if (error && !chat) {
        return (
            <div className={embedded ? 'chat-page chat-page--embedded' : 'chat-page'}>
                <div className="chat-error">
                    <div className="error-icon">❌</div>
                    <h3>Ошибка</h3>
                    <p>{error}</p>
                    {!embedded && (
                        <button className="btn-back" onClick={goBackToChats}>
                            ← Вернуться к чатам
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={embedded ? 'chat-page chat-page--embedded' : 'chat-page'}>
            {/* ── Шапка ── */}
            <header className="chat-header">
                {!embedded && (
                    <button className="btn-back" onClick={goBackToChats}>
                        ← Назад
                    </button>
                )}

                {chat?.type === 'Personal' && chat?.otherUser && (
                    <button
                        type="button"
                        className="chat-header-user chat-header-user--clickable"
                        onClick={goToOtherUserProfile}
                        title={`Открыть профиль ${chat.otherUser.name}`}
                    >
                        <div className="chat-header-avatar-wrapper">
                            <UserAvatar
                                avatarUrl={chat.otherUser.avatarUrl}
                                name={chat.otherUser.name}
                                email={chat.otherUser.email}
                                size="md"
                            />
                            {chat.otherUser.isOnline && (
                                <span className="chat-online-dot" title="Онлайн" />
                            )}
                        </div>
                        <div className="chat-header-info">
                            <div className="chat-header-name">{getChatTitle()}</div>
                            <div
                                className={`chat-header-status ${chat.otherUser.isOnline ? 'online' : 'offline'}`}
                            >
                                {chat.otherUser.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'}
                            </div>
                        </div>
                    </button>
                )}

                {chat?.type === 'Project' && (
                    <div className="chat-header-user">
                        <div className="chat-header-cover">
                            <ChatCover chat={chat} size="sm" />
                        </div>
                        <div className="chat-header-info">
                            <div className="chat-header-name">
                                {getChatTitle()}
                                {isArchived && (
                                    <span className="chat-archived-badge">📦 Архив</span>
                                )}
                            </div>
                            <div className="chat-header-status">
                                👥 {chat.participantsCount || 0} участников
                            </div>
                        </div>
                    </div>
                )}
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

                        const showSenderName =
                            !isOwn &&
                            (index === 0 ||
                                messages[index - 1]?.senderId !== message.senderId);

                        const isReadAll = isProjectChat
                            ? message.isReadByAll
                            : message.isRead;

                        const isFirstUnread = message.id === firstUnreadId;

                        const showSenderAvatar =
                            isProjectChat && !isOwn && showSenderName;

                        const canOpenSenderProfile =
                            !isOwn && isProjectChat && message.senderEmail;

                        const hasAttachment = !!message.attachmentUrl;
                        const isImageAttachment = message.type === 'Image' && hasAttachment;
                        const isFileAttachment = message.type === 'File' && hasAttachment;

                        return (
                            <React.Fragment key={message.id || index}>
                                {isFirstUnread && (
                                    <div className="chat-unread-divider">
                                        <span>Непрочитанные сообщения</span>
                                    </div>
                                )}

                                <div
                                    ref={(el) => {
                                        if (el) messageRefs.current.set(message.id, el);
                                        else messageRefs.current.delete(message.id);
                                    }}
                                    className={`chat-message ${isOwn ? 'own' : 'other'} ${showSenderAvatar ? 'with-avatar' : ''}`}
                                >
                                    {showSenderAvatar && (
                                        <div className="message-avatar">
                                            <UserAvatar
                                                avatarUrl={message.senderAvatarUrl}
                                                name={message.senderName}
                                                email={message.senderEmail}
                                                size="sm"
                                            />
                                        </div>
                                    )}

                                    <div className="message-content">
                                        {!isOwn && showSenderName && (
                                            <div className="message-sender-name">
                                                {canOpenSenderProfile ? (
                                                    <button
                                                        type="button"
                                                        className="sender-name-text sender-name-text--clickable"
                                                        onClick={() =>
                                                            navigate(
                                                                `/users/${encodeURIComponent(message.senderEmail)}`
                                                            )
                                                        }
                                                        title={`Открыть профиль ${message.senderName}`}
                                                    >
                                                        {message.senderName}
                                                    </button>
                                                ) : (
                                                    <span className="sender-name-text">
                                                        {message.senderName}
                                                    </span>
                                                )}
                                                {isProjectChat && message.senderRole && (
                                                    <span
                                                        className={`sender-role role-${message.senderRole.toLowerCase()}`}
                                                    >
                                                        {getRoleName(message.senderRole)}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="message-bubble-wrapper">
                                            <div className={`message-bubble ${isImageAttachment ? 'message-bubble--image' : ''}`}>
                                                {isImageAttachment && (
                                                    <button
                                                        type="button"
                                                        className="message-image-button"
                                                        onClick={() => window.open(toAbsoluteUrl(message.attachmentUrl), '_blank')}
                                                        title="Открыть в новой вкладке"
                                                    >
                                                        <img
                                                            src={toAbsoluteUrl(message.attachmentUrl)}
                                                            alt={message.attachmentFileName || 'Изображение'}
                                                            className="message-image"
                                                            loading="lazy"
                                                        />
                                                    </button>
                                                )}

                                                {isFileAttachment && (
                                                    <div className="message-file">
                                                        <div className="message-file-icon">📎</div>
                                                        <div className="message-file-info">
                                                            <div className="message-file-name" title={message.attachmentFileName}>
                                                                {message.attachmentFileName || 'Файл'}
                                                            </div>
                                                            <div className="message-file-size">
                                                                {formatBytes(message.attachmentSizeBytes)}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="message-file-download"
                                                            onClick={() => handleDownloadFile(message)}
                                                            title="Скачать"
                                                        >
                                                            ⬇️
                                                        </button>
                                                    </div>
                                                )}

                                                {message.text && (
                                                    <div className="message-text">{message.text}</div>
                                                )}

                                                <div className="message-time">
                                                    {formatTime(message.createdAt)}
                                                </div>
                                            </div>

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
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 📌 Поле ввода или плашка «архив» */}
            {isArchived ? (
                <div className="chat-archived-notice">
                    📦 Проект в архиве — отправка сообщений недоступна
                </div>
            ) : (
                <div className="chat-input-area">
                    {attachedFile && (
                        <div className="chat-attached-file">
                            <span className="chat-attached-file-icon">📎</span>
                            <span className="chat-attached-file-name" title={attachedFile.name}>
                                {attachedFile.name}
                            </span>
                            <span className="chat-attached-file-size">
                                {formatBytes(attachedFile.size)}
                            </span>
                            <button
                                type="button"
                                className="chat-attached-file-remove"
                                onClick={handleClearAttachedFile}
                                title="Убрать файл"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <form className="chat-input-form" onSubmit={handleSendMessage}>
                        <textarea
                            ref={textareaRef}
                            className="chat-input"
                            placeholder={
                                attachedFile
                                    ? 'Подпись к файлу (необязательно)...'
                                    : 'Введите сообщение...'
                            }
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows="1"
                            disabled={sending || uploadingFile}
                        />

                        <div className="chat-input-buttons">
                            <div className="emoji-btn-wrapper" ref={emojiButtonRef}>
                                <button
                                    type="button"
                                    className="btn-emoji"
                                    onClick={toggleEmojiPicker}
                                    disabled={sending || uploadingFile}
                                    title="Эмодзи"
                                >
                                    😊
                                </button>

                                {showEmojiPicker && (
                                    <EmojiPicker
                                        onSelect={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                        anchorRef={emojiButtonRef}
                                    />
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                                disabled={uploadingFile}
                            />
                            <button
                                type="button"
                                className="btn-attach"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile || sending}
                                title="Прикрепить файл"
                            >
                                📎
                            </button>

                            {attachedFile ? (
                                <button
                                    type="button"
                                    className="btn-send"
                                    onClick={handleSendFile}
                                    disabled={uploadingFile}
                                    title="Отправить файл"
                                >
                                    {uploadingFile ? '⏳' : '📤'}
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn-send"
                                    disabled={!newMessage.trim() || sending}
                                    title="Отправить"
                                >
                                    {sending ? '⏳' : '📤'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatPage;