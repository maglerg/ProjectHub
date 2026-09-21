// projecthub.client/src/components/FriendsList.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MemberCard from './MemberCard';
import UserAvatar from './UserAvatar';   // 🆕
import { getUserProfileByEmail } from '../services/userApi';
import { getFriendStatus, sendFriendRequest } from '../services/friendRequestsApi';
import '../styles/components/FriendsList.css';

const FriendsList = ({ friends, loading, onFriendAdded, onFriendRemoved }) => {
    const navigate = useNavigate();
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [notification, setNotification] = useState(null);
    const [friendStatus, setFriendStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 📌 Поиск пользователя по email
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
                    console.warn('Не удалось проверить статус:', err);
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

    // 📌 Отправить заявку в друзья
    const handleSendRequest = async () => {
        if (!foundUser?.email || isProcessing) return;

        setIsProcessing(true);
        setNotification(null);
        try {
            await sendFriendRequest(foundUser.email);
            setFriendStatus({ ...friendStatus, status: 'Pending' });
            setNotification({ type: 'success', text: '✅ Заявка отправлена!' });
            setTimeout(() => setNotification(null), 3000);

            if (onFriendAdded) {
                onFriendAdded(foundUser);
            }
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка') });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    // 📌 Переход в профиль
    const handleGoToProfile = () => {
        if (foundUser?.email) {
            const encodedEmail = encodeURIComponent(foundUser.email);
            navigate(`/users/${encodedEmail}`);
        }
    };

    // 📌 Очистить результаты поиска
    const clearSearch = () => {
        setFoundUser(null);
        setSearchEmail('');
        setSearchError('');
        setFriendStatus(null);
        setNotification(null);
    };

    // 📌 Перейти к заявкам в друзья
    const handleGoToRequests = () => {
        navigate('/friends/requests');
    };

    return (
        <div className="friends-page">
            {/* ── Поиск пользователя ── */}
            <section className="friends-search-section">
                <div className="friends-search-header">
                    <h2>👥 Друзья</h2>
                    <span className="friends-count-badge">
                        {friends.length} чел.
                    </span>
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
                        <button
                            type="submit"
                            disabled={isSearching || !searchEmail.trim()}
                        >
                            {isSearching ? '⏳' : '🔍 Найти'}
                        </button>
                    </div>
                    {searchError && (
                        <div className="search-error">❌ {searchError}</div>
                    )}
                </form>

                {/* ── Кнопка перехода к заявкам ── */}
                <button
                    type="button"
                    className="btn-go-to-requests"
                    onClick={handleGoToRequests}
                >
                    📩 Заявки в друзья
                </button>

                {/* ── Результат поиска ── */}
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
                            {/* 🆕 Аватар найденного пользователя */}
                            <div className="search-result-avatar-wrapper">
                                <UserAvatar
                                    avatarUrl={foundUser.avatarUrl}
                                    name={foundUser.name}
                                    email={foundUser.email}
                                    size="md"
                                />
                                {foundUser.isOnline && (
                                    <span
                                        className="search-result-online-dot"
                                        title="Онлайн"
                                    />
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
                                    onClick={handleSendRequest}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? '⏳' : '📩 Отправить заявку'}
                                </button>
                            )}

                            <button
                                className="btn-view-profile"
                                onClick={handleGoToProfile}
                            >
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
                                onRemove={() => onFriendRemoved && onFriendRemoved(friend.id)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default FriendsList;