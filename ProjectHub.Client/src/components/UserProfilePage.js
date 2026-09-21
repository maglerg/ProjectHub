// projecthub.client/src/components/UserProfilePage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfileByEmail } from '../services/userApi';
import { getFriendStatus, sendFriendRequest, cancelFriendRequest, processFriendRequest } from '../services/friendRequestsApi';
import { getFriends, removeFriend } from '../services/friendsApi';
import { createPersonalChat } from '../services/chatsApi';
import UserAvatar from './UserAvatar';   // 🆕
import '../styles/components/UserProfilePage.css';

const UserProfilePage = () => {
    const { email } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [friendStatus, setFriendStatus] = useState({ status: 'None', isFriend: false, requestId: null });
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isFriend, setIsFriend] = useState(false);

    useEffect(() => {
        loadUserProfile();
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
            setNotification({ type: 'success', text: '✅ Заявка отправлена!' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
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
            setNotification({ type: 'success', text: '✅ Заявка отменена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
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
            const friend = friendsList.find(f => f.email === user.email);
            if (friend) {
                await removeFriend(friend.id);
                setIsFriend(false);
                setFriendStatus({ status: 'None', isFriend: false, requestId: null });
                setNotification({ type: 'success', text: '✅ Удален из друзей' });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
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
            setNotification({ type: 'success', text: '✅ Заявка принята! Вы теперь друзья' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
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
            setNotification({ type: 'success', text: '✅ Заявка отклонена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
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
                    text: '👥 Этот пользователь принимает сообщения только от друзей. Отправьте заявку в друзья.'
                });
            } else {
                setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            }
            setTimeout(() => setNotification(null), 5000);
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="user-profile-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка профиля...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-profile-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-profile-not-found">
                <div className="not-found-icon">👤</div>
                <h3>Пользователь не найден</h3>
                <p>Возможно, пользователь был удален</p>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
            </div>
        );
    }

    const isOwnProfile = currentUser?.email === user.email;

    // 📌 Определяем, что показывать
    const renderFriendButton = () => {
        if (isFriend) {
            return (
                <button
                    className="btn-friend friend"
                    onClick={handleRemoveFriend}
                    disabled={isProcessing}
                >
                    {isProcessing ? '⏳' : '❌ Удалить из друзей'}
                </button>
            );
        }

        if (friendStatus.status === 'Pending') {
            return (
                <button
                    className="btn-friend pending"
                    onClick={handleCancelRequest}
                    disabled={isProcessing}
                >
                    {isProcessing ? '⏳' : '↩️ Отменить заявку'}
                </button>
            );
        }

        if (friendStatus.status === 'Received') {
            return (
                <div className="friend-request-received">
                    <span>📩 Вам отправлена заявка в друзья</span>
                    <div className="friend-request-actions">
                        <button
                            className="btn-friend accept"
                            onClick={handleAcceptRequest}
                            disabled={isProcessing}
                        >
                            ✅ Принять
                        </button>
                        <button
                            className="btn-friend reject"
                            onClick={handleRejectRequest}
                            disabled={isProcessing}
                        >
                            ❌ Отклонить
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <button
                className="btn-friend not-friend"
                onClick={handleSendRequest}
                disabled={isProcessing}
            >
                {isProcessing ? '⏳' : '➕ Отправить заявку'}
            </button>
        );
    };

    return (
        <div className="user-profile-page">
            <header className="user-profile-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
                <h1>👤 Профиль пользователя</h1>
            </header>

            <div className="user-profile-content">
                {notification && (
                    <div className={`notification ${notification.type}`}>
                        {notification.text}
                    </div>
                )}

                <div className="user-profile-card">
                    {/* 🆕 Аватар пользователя */}
                    <div className="user-profile-avatar-wrapper">
                        <UserAvatar
                            avatarUrl={user.avatarUrl}
                            name={user.name}
                            email={user.email}
                            size="xl"
                        />
                        {user.isOnline && (
                            <span
                                className="profile-online-dot"
                                title="Онлайн"
                            />
                        )}
                    </div>

                    <div className="user-profile-info">
                        <div className="info-row">
                            <span className="info-label">Имя</span>
                            <span className="info-value">{user.name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Email</span>
                            <span className="info-value">{user.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Специализация</span>
                            <span className="info-value">{user.specialization || 'Не указана'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Статус</span>
                            <span className={`user-status ${user.isOnline ? 'online' : 'offline'}`}>
                                {user.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">На сайте с</span>
                            <span className="info-value">
                                {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">💬 Сообщения</span>
                            <span className="info-value privacy-badge">
                                👥 Только от друзей
                            </span>
                        </div>
                    </div>

                    {user.description && (
                        <div className="user-profile-description">
                            <h3>📝 О себе</h3>
                            <p>{user.description}</p>
                        </div>
                    )}

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

                    <div className="user-profile-actions">
                        {!isOwnProfile && renderFriendButton()}

                        <button
                            className="btn-send-message"
                            onClick={handleSendMessage}
                            disabled={isProcessing}
                        >
                            {isProcessing ? '⏳' : '💬 Отправить сообщение'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;