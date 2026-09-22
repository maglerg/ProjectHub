// projecthub.client/src/components/FriendsList.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MemberCard from './MemberCard';
import UserAvatar from './UserAvatar';
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
import '../styles/components/FriendsList.css';

const FriendsList = ({ friends, loading, onFriendAdded, onFriendRemoved }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [notification, setNotification] = useState(null);
    const [friendStatus, setFriendStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // ── Поиск пользователя по email ──
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchEmail.trim()) {
            setSearchError('Введите email');
            return;
        }

        setIsSearching(true);
        setSearchError('');
        setFoundUser(null);
        setFriendStatus(null);

        try {
            const user = await getUserProfileByEmail(searchEmail);
            if (user) {
                setFoundUser(user);
                try {
                    const status = await getFriendStatus(user.email);
                    setFriendStatus(status);
                } catch (err) {
                    setFriendStatus({ status: 'None', isFriend: false });
                }
            } else {
                setSearchError('Пользователь не найден');
            }
        } catch (err) {
            setSearchError(err.message || 'Ошибка поиска пользователя');
        } finally {
            setIsSearching(false);
        }
    };

    // ── Отправить заявку ──
    const handleSendRequest = async (targetUser) => {
        const email = targetUser?.email || foundUser?.email;
        if (!email || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await sendFriendRequest(email);

            // обновляем статус
            if (foundUser && foundUser.email === email) {
                setFriendStatus((prev) => ({ ...(prev || {}), status: 'Pending' }));
            }

            setNotification({ type: 'success', text: '✅ Заявка отправлена!' });
            setTimeout(() => setNotification(null), 3000);

            if (onFriendAdded) onFriendAdded(targetUser || foundUser);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Отменить заявку ──
    const handleCancelRequest = async (targetUser, requestId) => {
        if (!requestId || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await cancelFriendRequest(requestId);

            if (foundUser && foundUser.email === targetUser?.email) {
                setFriendStatus((prev) => ({ ...(prev || {}), status: 'None', requestId: null }));
            }

            setNotification({ type: 'success', text: '✅ Заявка отменена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Принять заявку ──
    const handleAcceptRequest = async (targetUser, requestId) => {
        if (!requestId || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await processFriendRequest(requestId, true);

            if (foundUser && foundUser.email === targetUser?.email) {
                setFriendStatus({ status: 'Friend', isFriend: true, requestId: null });
            }

            setNotification({ type: 'success', text: '✅ Заявка принята!' });
            setTimeout(() => setNotification(null), 3000);

            // при желании можно перезагрузить список друзей
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Отклонить заявку ──
    const handleRejectRequest = async (targetUser, requestId) => {
        if (!requestId || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await processFriendRequest(requestId, false);

            if (foundUser && foundUser.email === targetUser?.email) {
                setFriendStatus((prev) => ({ ...(prev || {}), status: 'None', requestId: null }));
            }

            setNotification({ type: 'success', text: '✅ Заявка отклонена' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Удалить из друзей ──
    const handleRemoveFriend = async (targetUser) => {
        if (isProcessing) return;

        if (!window.confirm(`Удалить ${targetUser?.name || targetUser?.email} из друзей?`)) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            const friendsList = await getFriends();
            const friend = friendsList.find((f) => f.email === targetUser.email);
            if (friend) {
                await removeFriend(friend.id);

                if (foundUser && foundUser.email === targetUser.email) {
                    setFriendStatus({ status: 'None', isFriend: false, requestId: null });
                }

                if (onFriendRemoved) onFriendRemoved(friend.id);

                setNotification({ type: 'success', text: '✅ Удалён из друзей' });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Отправить сообщение ──
    const handleSendMessage = async (targetUser) => {
        if (!targetUser?.email || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            const chat = await createPersonalChat(targetUser.email);
            navigate(`/chats/${chat.id}`);
        } catch (err) {
            if (err.message?.includes('только от друзей')) {
                setNotification({
                    type: 'info',
                    text: '👥 Этот пользователь принимает сообщения только от друзей.',
                });
            } else {
                setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            }
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGoToProfile = () => {
        if (foundUser?.email) {
            navigate(`/users/${encodeURIComponent(foundUser.email)}`);
        }
    };

    const clearSearch = () => {
        setFoundUser(null);
        setSearchEmail('');
        setSearchError('');
        setFriendStatus(null);
        setNotification(null);
    };

    const handleGoToRequests = () => {
        navigate('/friends/requests');
    };

    return (
        <div className="friends-page">
            {/* ── Поиск пользователя ── */}
            <section className="friends-search-section">
                <div className="friends-search-header">
                    <h2>👥 Друзья</h2>
                    <span className="friends-count-badge">{friends.length} чел.</span>
                </div>

                <form className="search-user-form" onSubmit={handleSearch}>
                    <div className="search-user-input-group">
                        <input
                            type="email"
                            placeholder="Введите email пользователя"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            disabled={isSearching}
                        />
                        <button type="submit" disabled={isSearching || !searchEmail.trim()}>
                            {isSearching ? '⏳' : '🔍 Найти'}
                        </button>
                    </div>
                    {searchError && <div className="search-error">❌ {searchError}</div>}
                </form>

                <button
                    type="button"
                    className="btn-go-to-requests"
                    onClick={handleGoToRequests}
                >
                    📩 Заявки в друзья
                </button>

                {foundUser && (
                    <div className="search-result">
                        <div className="search-result-header">
                            <span>Результат поиска</span>
                            <button
                                className="clear-search-btn"
                                onClick={clearSearch}
                                title="Очистить"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="search-result-card">
                            <div className="search-result-avatar-wrapper">
                                <UserAvatar
                                    avatarUrl={foundUser.avatarUrl}
                                    name={foundUser.name}
                                    email={foundUser.email}
                                    size="md"
                                />
                                {foundUser.isOnline && (
                                    <span className="search-result-online-dot" title="Онлайн" />
                                )}
                            </div>
                            <div className="search-result-info">
                                <div className="search-result-name">{foundUser.name}</div>
                                <div className="search-result-email">{foundUser.email}</div>
                                <div className="search-result-specialization">
                                    {foundUser.specialization || '—'}
                                </div>
                                <div className="search-result-status">
                                    {foundUser.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'}
                                </div>
                            </div>
                        </div>

                        <div className="search-result-actions">
                            {friendStatus?.isFriend ? (
                                <div className="already-friend">✅ Уже в друзьях</div>
                            ) : friendStatus?.status === 'Pending' ? (
                                <div className="request-pending">⏳ Заявка отправлена</div>
                            ) : friendStatus?.status === 'Received' ? (
                                <div className="request-received">📩 Вам отправлена заявка</div>
                            ) : (
                                <button
                                    className="btn-send-request"
                                    onClick={() => handleSendRequest(foundUser)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? '⏳' : '📩 Отправить заявку'}
                                </button>
                            )}

                            <button className="btn-view-profile" onClick={handleGoToProfile}>
                                👤 Профиль
                            </button>
                        </div>

                        {notification && (
                            <div className={`search-notification ${notification.type}`}>
                                {notification.text}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Список друзей ── */}
            <section className="friends-list-section">
                {loading ? (
                    <div className="friends-loading">⏳ Загрузка друзей…</div>
                ) : friends.length === 0 ? (
                    <div className="no-friends">
                        <div className="no-friends-icon">👤</div>
                        <h3>Нет друзей</h3>
                        <p>Найдите пользователей по email и отправьте заявку</p>
                    </div>
                ) : (
                    <div className="friends-grid">
                        {friends.map((friend) => (
                            <MemberCard
                                key={friend.id}
                                member={friend}
                                friendStatus={{
                                    status: 'Friend',
                                    isFriend: true,
                                    requestId: null,
                                }}
                                onSendMessage={handleSendMessage}
                                onRemoveFriend={handleRemoveFriend}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default FriendsList;