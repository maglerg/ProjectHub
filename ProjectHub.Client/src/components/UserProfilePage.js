// projecthub.client/src/components/UserProfilePage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    X,
    Loader2,
    Check,
    UserPlus,
    Undo2,
    MessageCircle,
    Users,
    Globe,
    FileText,
    Inbox,
    CalendarDays,
    Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfileByEmail } from '../services/userApi';
import {
    getFriendStatus,
    sendFriendRequest,
    cancelFriendRequest,
    processFriendRequest,
} from '../services/friendRequestsApi';
import { getFriends, removeFriend } from '../services/friendsApi';
import { createPersonalChat } from '../services/chatsApi';
import UserAvatar from './UserAvatar';
import '../styles/components/UserProfilePage.css';

const UserProfilePage = () => {
    const { email } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [friendStatus, setFriendStatus] = useState({
        status: 'None',
        isFriend: false,
        requestId: null,
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isFriend, setIsFriend] = useState(false);

    useEffect(() => {
        loadUserProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email]);

    const loadUserProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const decodedEmail = decodeURIComponent(email);
            const data = await getUserProfileByEmail(decodedEmail);
            setUser(data);

            if (data && currentUser && data.email !== currentUser.email) {
                try {
                    const status = await getFriendStatus(data.email);
                    setFriendStatus(status);
                    setIsFriend(status.isFriend);
                } catch (err) {
                    console.warn('Не удалось проверить статус:', err);
                }
            }
        } catch (err) {
            setError(err.message || 'Не удалось загрузить профиль');
        } finally {
            setLoading(false);
        }
    };

    // 📌 Отправить заявку
    const handleSendRequest = async () => {
        if (!user?.email || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await sendFriendRequest(user.email);
            setFriendStatus({ ...friendStatus, status: 'Pending' });
            setNotification({ type: 'success', text: 'Заявка отправлена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: err.message || 'Ошибка' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // 📌 Отменить заявку
    const handleCancelRequest = async () => {
        if (!friendStatus.requestId || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await cancelFriendRequest(friendStatus.requestId);
            setFriendStatus({ ...friendStatus, status: 'None', requestId: null });
            setNotification({ type: 'success', text: 'Заявка отменена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: err.message || 'Ошибка' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // 📌 Удалить из друзей
    const handleRemoveFriend = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            const friendsList = await getFriends();
            const friend = friendsList.find((f) => f.email === user.email);
            if (friend) {
                await removeFriend(friend.id);
                setIsFriend(false);
                setFriendStatus({ status: 'None', isFriend: false, requestId: null });
                setNotification({ type: 'success', text: 'Удалён из друзей' });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (err) {
            setNotification({ type: 'error', text: err.message || 'Ошибка' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // 📌 Принять заявку
    const handleAcceptRequest = async () => {
        if (!friendStatus.requestId || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await processFriendRequest(friendStatus.requestId, true);
            setIsFriend(true);
            setFriendStatus({ status: 'Friend', isFriend: true, requestId: null });
            setNotification({ type: 'success', text: 'Заявка принята — вы теперь друзья' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: err.message || 'Ошибка' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // 📌 Отклонить заявку
    const handleRejectRequest = async () => {
        if (!friendStatus.requestId || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await processFriendRequest(friendStatus.requestId, false);
            setFriendStatus({ ...friendStatus, status: 'None', requestId: null });
            setNotification({ type: 'success', text: 'Заявка отклонена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: err.message || 'Ошибка' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // 📌 Отправить сообщение — открыть чат
    const handleSendMessage = async () => {
        if (!user?.email || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);

        try {
            const chat = await createPersonalChat(user.email);
            navigate(`/chats/${chat.id}`);
        } catch (err) {
            if (err.message?.includes('только от друзей')) {
                setNotification({
                    type: 'info',
                    text: 'Этот пользователь принимает сообщения только от друзей. Отправьте заявку в друзья.',
                });
            } else {
                setNotification({ type: 'error', text: err.message || 'Ошибка' });
            }
            setTimeout(() => setNotification(null), 5000);
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="user-profile-loading">
                <Loader2 size={32} className="icon-spin" />
                <p>Загрузка профиля…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-profile-error">
                <div className="user-profile-state-icon">
                    <X size={28} />
                </div>
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-profile-not-found">
                <div className="user-profile-state-icon">
                    <User size={28} />
                </div>
                <h3>Пользователь не найден</h3>
                <p>Возможно, пользователь был удалён</p>
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>
            </div>
        );
    }

    const isOwnProfile = currentUser?.email === user.email;

    // 📌 Реальная настройка приватности (никаких хардкодов)
    const chatPrivacy = user.chatPrivacy || 'All';
    const isFriendsOnly = chatPrivacy === 'FriendsOnly';

    // 📌 Кнопка «дружбы»
    const renderFriendButton = () => {
        if (isFriend) {
            return (
                <button
                    type="button"
                    className="btn btn--danger-outline"
                    onClick={handleRemoveFriend}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={16} className="icon-spin" />
                            Удаление…
                        </>
                    ) : (
                        <>
                            <X size={16} />
                            Удалить из друзей
                        </>
                    )}
                </button>
            );
        }

        if (friendStatus.status === 'Pending') {
            return (
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleCancelRequest}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={16} className="icon-spin" />
                            Отмена…
                        </>
                    ) : (
                        <>
                            <Undo2 size={16} />
                            Отменить заявку
                        </>
                    )}
                </button>
            );
        }

        if (friendStatus.status === 'Received') {
            return (
                <div className="friend-request-received">
                    <span className="friend-request-received__text">
                        <Inbox size={14} />
                        Вам отправлена заявка в друзья
                    </span>
                    <div className="friend-request-received__actions">
                        <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={handleAcceptRequest}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={14} className="icon-spin" />
                                    Принятие…
                                </>
                            ) : (
                                <>
                                    <Check size={14} />
                                    Принять
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="btn btn--danger-outline btn--sm"
                            onClick={handleRejectRequest}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={14} className="icon-spin" />
                                    Отклонение…
                                </>
                            ) : (
                                <>
                                    <X size={14} />
                                    Отклонить
                                </>
                            )}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <button
                type="button"
                className="btn btn--primary"
                onClick={handleSendRequest}
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <>
                        <Loader2 size={16} className="icon-spin" />
                        Отправка…
                    </>
                ) : (
                    <>
                        <UserPlus size={16} />
                        Отправить заявку
                    </>
                )}
            </button>
        );
    };

    return (
        <div className="user-profile-page">
            <header className="user-profile-header">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>
                <h1>
                    <User size={20} />
                    Профиль пользователя
                </h1>
            </header>

            <div className="user-profile-content">
                {notification && (
                    <div className={`user-profile-notification ${notification.type}`}>
                        {notification.text}
                    </div>
                )}

                <div className="user-profile-card">
                    {/* ── Шапка профиля: аватар + имя + специализация ── */}
                    <div className="user-profile-hero">
                        <div className="user-profile-avatar-wrapper">
                            <UserAvatar
                                avatarUrl={user.avatarUrl}
                                name={user.name}
                                email={user.email}
                                size="xl"
                            />
                            <span
                                className={`profile-online-dot ${user.isOnline ? 'online' : 'offline'}`}
                                title={user.isOnline ? 'Онлайн' : 'Оффлайн'}
                            />
                        </div>

                        <div className="user-profile-hero-info">
                            <h2 className="user-profile-name">{user.name}</h2>
                            <p className="user-profile-specialization">
                                {user.specialization || 'Специализация не указана'}
                            </p>
                            <div className="user-profile-hero-status">
                                <span className={`user-status ${user.isOnline ? 'online' : 'offline'}`}>
                                    {user.isOnline ? 'Онлайн' : 'Оффлайн'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Информация ── */}
                    <div className="user-profile-info">
                        <div className="info-row">
                            <span className="info-label">
                                <Mail size={14} />
                                Email
                            </span>
                            <span className="info-value">{user.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">
                                <CalendarDays size={14} />
                                На сайте с
                            </span>
                            <span className="info-value">
                                {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">
                                <MessageCircle size={14} />
                                Кто может писать
                            </span>
                            {isFriendsOnly ? (
                                <span className="privacy-badge privacy-badge--friends">
                                    <Users size={13} />
                                    Только друзья
                                </span>
                            ) : (
                                <span className="privacy-badge privacy-badge--all">
                                    <Globe size={13} />
                                    Все пользователи
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── О себе ── */}
                    {user.description && (
                        <div className="user-profile-description">
                            <h3>
                                <FileText size={16} />
                                О себе
                            </h3>
                            <p>{user.description}</p>
                        </div>
                    )}

                    {/* ── Статистика ── */}
                    <div className="user-profile-stats">
                        <div className="stat-card">
                            <span className="stat-number">{user.projectsCount || 0}</span>
                            <span className="stat-label">Проектов</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-number">{user.completedProjectsCount || 0}</span>
                            <span className="stat-label">Завершено</span>
                        </div>
                    </div>

                    {/* ── Действия ── */}
                    {!isOwnProfile && (
                        <div className="user-profile-actions">
                            {renderFriendButton()}

                            <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={handleSendMessage}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={16} className="icon-spin" />
                                        Отправка…
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle size={16} />
                                        Отправить сообщение
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;