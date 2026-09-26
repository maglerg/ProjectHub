// projecthub.client/src/components/ChatPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    X,
    Smile,
    Paperclip,
    Send,
    Download,
    Loader2,
    MessageCircle,
    Archive,
    Users,
    FileText,
    CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    getChatById,
    getChatMessages,
    sendMessage,
    sendChatFile,
    downloadChatFile,
} from '../services/chatsApi';
import { signalr } from '../services/signalrService';
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

    // 🆕 Храним chatId в ref — чтобы обработчики SignalR всегда видели актуальное
    const chatIdRef = useRef(chatId);
    useEffect(() => { chatIdRef.current = chatId; }, [chatId]);

    // 🆕 Текущее имя пользователя — чтобы сравнивать senderEmail без пересоздания подписок
    const userEmailRef = useRef(user?.email);
    useEffect(() => { userEmailRef.current = user?.email; }, [user?.email]);

    // 🆕 Таймер для дебаунса отметки «прочитано»
    const markReadTimerRef = useRef(null);

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

    // 🆕 Тихая перезагрузка — для reconnect (без сброса scroll и unread-маркера)
    const refreshMessages = useCallback(async () => {
        if (!chatId) return;
        try {
            const messagesData = await getChatMessages(chatId);
            setMessages(messagesData);
        } catch (err) {
            console.warn('Не удалось обновить сообщения:', err);
        }
    }, [chatId]);

    // 🆕 Тихая отметка чата прочитанным.
    //    Запрашиваем только 1 последнее сообщение (минимум трафика).
    //    Побочные эффекты на бэке:
    //      • все непрочитанные помечаются ChatMessageRead
    //      • LastReadAt участника обновляется
    //      • в chat:{chatId} эмитится MessagesRead → у отправителя загораются ✓✓
    //      • в user:{userId} эмитится UnreadCountChanged(chatId, 0) → badge сбрасывается
    //
    //    Дебаунс 400мс — если в течение этого окна придёт ещё сообщение,
    //    таймер сбросится, и мы сделаем только один запрос.
    const markCurrentChatAsRead = useCallback(() => {
        if (markReadTimerRef.current) {
            clearTimeout(markReadTimerRef.current);
        }
        markReadTimerRef.current = setTimeout(async () => {
            markReadTimerRef.current = null;
            try {
                await getChatMessages(chatIdRef.current, 0, 1);
            } catch (err) {
                // не критично — тихо игнорируем
                console.warn('Не удалось отметить чат прочитанным:', err);
            }
        }, 400);
    }, []);

    useEffect(() => {
        loadChat();
    }, [loadChat, refreshKey]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: JoinChat / LeaveChat + подписки на события
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!chatId) return;

        let cancelled = false;

        // ── Новое сообщение (включая свои — отправителю SignalR тоже эмитит) ──
        const handleReceiveMessage = (message) => {
            if (!message || message.chatId !== chatIdRef.current) return;

            setMessages((prev) => {
                // Защита от дублей
                if (prev.some((m) => m.id === message.id)) return prev;
                return [...prev, message];
            });

            setTimeout(scrollToBottom, 100);

            // 🆕 Если чат реально открыт (вкладка видима) —
            //    сразу помечаем прочитанным. Иначе непрочитанные будут копиться,
            //    и у отправителя не загорятся ✓✓.
            //    Если окно свёрнуто — не отмечаем, чтобы сохранить счётчик непрочитанных.
            if (!isArchived && document.visibilityState === 'visible') {
                markCurrentChatAsRead();
            }
        };

        // ── Кто-то прочитал чат ──
        const handleMessagesRead = (readChatId, readUserId) => {
            if (readChatId !== chatIdRef.current) return;

            setMessages((prev) =>
                prev.map((m) => {
                    // Обновляем только свои сообщения (не те, что написал readUserId)
                    if (m.senderId === readUserId) return m;

                    const newReadCount = Math.min(
                        (m.readCount || 0) + 1,
                        m.totalParticipants || 1
                    );

                    return {
                        ...m,
                        readCount: newReadCount,
                        isReadByAll: newReadCount >= (m.totalParticipants || 1),
                        isRead: true,
                    };
                })
            );
        };

        // ── Собеседник зашёл в сеть ──
        const handleUserOnline = () => {
            // Обновляем чат через REST (чтобы подтянуть свежий isOnline у собеседника)
            if (chatIdRef.current) {
                getChatById(chatIdRef.current)
                    .then((data) => setChat(data))
                    .catch(() => { });
            }
        };

        // ── Собеседник ушёл в оффлайн ──
        const handleUserOffline = () => {
            if (chatIdRef.current) {
                getChatById(chatIdRef.current)
                    .then((data) => setChat(data))
                    .catch(() => { });
            }
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing chat…');
            signalr.invoke('JoinChat', chatIdRef.current).catch(() => { });
            refreshMessages();
            // После reconnect — сразу отмечаем прочитанным (могли накопиться сообщения)
            if (!isArchived && document.visibilityState === 'visible') {
                markCurrentChatAsRead();
            }
        };

        signalr.on('ReceiveMessage', handleReceiveMessage);
        signalr.on('MessagesRead', handleMessagesRead);
        signalr.on('UserOnline', handleUserOnline);
        signalr.on('UserOffline', handleUserOffline);
        signalr.on('_reconnected', handleReconnected);

        // Войти в комнату чата
        (async () => {
            try {
                await signalr.connect();
                if (cancelled) return;
                await signalr.invoke('JoinChat', chatId);
            } catch (err) {
                console.warn('Не удалось присоединиться к SignalR-чату:', err);
            }
        })();

        return () => {
            cancelled = true;

            // 🆕 Очищаем таймер дебаунса
            if (markReadTimerRef.current) {
                clearTimeout(markReadTimerRef.current);
                markReadTimerRef.current = null;
            }

            signalr.off('ReceiveMessage', handleReceiveMessage);
            signalr.off('MessagesRead', handleMessagesRead);
            signalr.off('UserOnline', handleUserOnline);
            signalr.off('UserOffline', handleUserOffline);
            signalr.off('_reconnected', handleReconnected);

            // Выйти из комнаты
            signalr.invoke('LeaveChat', chatId).catch(() => { });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId, isArchived, markCurrentChatAsRead, refreshMessages]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 ВОЗВРАТ НА ВКЛАДКУ / ФОКУС ОКНА — отметка прочтения
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!chatId || isArchived) return;

        // Возврат на вкладку (переключился с другой вкладки браузера)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                markCurrentChatAsRead();
            }
        };

        // Возврат фокуса в окно (переключился с другого приложения)
        const handleFocus = () => {
            markCurrentChatAsRead();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [chatId, isArchived, markCurrentChatAsRead]);

    // ═══════════════════════════════════════════════════════════
    //  АВТОФОКУС
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (isArchived) return;
        if (!chatId) return;

        const handleGlobalKeyDown = (e) => {
            const active = document.activeElement;

            const isInInput =
                active &&
                (active.tagName === 'INPUT' ||
                    active.tagName === 'TEXTAREA' ||
                    active.isContentEditable);

            const isInsideOverlay =
                active &&
                active.closest(
                    '[role="dialog"], .emoji-picker, .modal-overlay, .edit-modal-overlay'
                );

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

            textareaRef.current?.focus();

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

        if (attachedFile) {
            await handleSendFile();
            return;
        }

        if (!newMessage.trim()) return;

        setSending(true);
        const textToSend = newMessage.trim();
        setNewMessage('');
        setShowEmojiPicker(false);

        try {
            const sentMessage = await sendMessage(chatId, textToSend);

            // Если SignalR подключён — сообщение придёт через 'ReceiveMessage'.
            // Если нет — добавляем вручную, чтобы не терять.
            if (!signalr.isConnected()) {
                setMessages((prev) =>
                    prev.some((m) => m.id === sentMessage.id)
                        ? prev
                        : [...prev, sentMessage]
                );
                setTimeout(scrollToBottom, 100);
            }

            setFirstUnreadId(null);
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

            if (!signalr.isConnected()) {
                setMessages((prev) =>
                    prev.some((m) => m.id === sentMessage.id)
                        ? prev
                        : [...prev, sentMessage]
                );
                setTimeout(scrollToBottom, 100);
            }

            setAttachedFile(null);
            setNewMessage('');
            if (fileInputRef.current) fileInputRef.current.value = '';

            setFirstUnreadId(null);
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

    const isOwnMessage = (message) =>
        message.senderEmail?.toLowerCase() === user?.email?.toLowerCase();

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
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/projects');
        }
    };

    if (loading) {
        return (
            <div className={embedded ? 'chat-page chat-page--embedded' : 'chat-page'}>
                <div className="chat-loading">
                    <div className="spinner">
                        <Loader2 size={32} className="icon-spin" />
                    </div>
                    <p>Загрузка чата...</p>
                </div>
            </div>
        );
    }

    if (error && !chat) {
        return (
            <div className={embedded ? 'chat-page chat-page--embedded' : 'chat-page'}>
                <div className="chat-error">
                    <div className="error-icon">
                        <X size={32} />
                    </div>
                    <h3>Ошибка</h3>
                    <p>{error}</p>
                    {!embedded && (
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={goBackToChats}
                        >
                            <ArrowLeft size={16} />
                            Вернуться к чатам
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
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={goBackToChats}
                    >
                        <ArrowLeft size={16} />
                        Назад
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
                                    <span className="chat-archived-badge">
                                        <Archive size={12} />
                                        Архив
                                    </span>
                                )}
                            </div>
                            <div className="chat-header-status">
                                <Users size={12} />
                                {chat.participantsCount || 0} участников
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* 📌 Сообщения */}
            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">
                            <MessageCircle size={48} />
                        </div>
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
                                                        <div className="message-file-icon">
                                                            <FileText size={20} />
                                                        </div>
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
                                                            className="btn btn--ghost btn--icon btn--sm message-file-download"
                                                            onClick={() => handleDownloadFile(message)}
                                                            title="Скачать"
                                                            aria-label="Скачать файл"
                                                        >
                                                            <Download size={14} />
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
                                                    <CheckCheck size={12} />
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
                    <Archive size={16} />
                    Проект в архиве — отправка сообщений недоступна
                </div>
            ) : (
                <div className="chat-input-area">
                    {attachedFile && (
                        <div className="chat-attached-file">
                            <span className="chat-attached-file-icon">
                                <Paperclip size={14} />
                            </span>
                            <span className="chat-attached-file-name" title={attachedFile.name}>
                                {attachedFile.name}
                            </span>
                            <span className="chat-attached-file-size">
                                {formatBytes(attachedFile.size)}
                            </span>
                            <button
                                type="button"
                                className="btn btn--ghost btn--icon btn--sm chat-attached-file-remove"
                                onClick={handleClearAttachedFile}
                                title="Убрать файл"
                                aria-label="Убрать файл"
                            >
                                <X size={14} />
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
                                    className="btn btn--ghost btn--icon chat-input-icon-btn"
                                    onClick={toggleEmojiPicker}
                                    disabled={sending || uploadingFile}
                                    title="Эмодзи"
                                    aria-label="Эмодзи"
                                >
                                    <Smile size={18} />
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
                                className="btn btn--ghost btn--icon chat-input-icon-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile || sending}
                                title="Прикрепить файл"
                                aria-label="Прикрепить файл"
                            >
                                <Paperclip size={18} />
                            </button>

                            {attachedFile ? (
                                <button
                                    type="button"
                                    className="btn btn--primary btn--icon chat-send-btn"
                                    onClick={handleSendFile}
                                    disabled={uploadingFile}
                                    title="Отправить файл"
                                    aria-label="Отправить файл"
                                >
                                    {uploadingFile ? (
                                        <Loader2 size={18} className="icon-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn--primary btn--icon chat-send-btn"
                                    disabled={!newMessage.trim() || sending}
                                    title="Отправить"
                                    aria-label="Отправить"
                                >
                                    {sending ? (
                                        <Loader2 size={18} className="icon-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
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