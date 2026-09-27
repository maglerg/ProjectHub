// projecthub.client/src/components/FriendsList.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Loader2,
    UserPlus,
    User,
    Mail,
    Check,
    X,
    Inbox,
} from 'lucide-react';
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
import { signalr } from '../services/signalrService';
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

    // 🆕 Ref — чтобы обработчики SignalR видели актуальный найденный email
    const foundUserRef = useRef(foundUser);
    useEffect(() => { foundUserRef.current = foundUser; }, [foundUser]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: подписки на события друзей и заявок
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        // ── Заявка обработана (собеседником или мной) ──
        const handleRequestProcessed = (payload) => {
            const current = foundUserRef.current;
            if (!current) return;

            const { senderId, receiverId, status } = payload || {};

            // Меняем статус, только если это касается найденного пользователя
            const involvesFoundUser =
                current.id === senderId || current.id === receiverId;

            if (!involvesFoundUser) return;

            if (status === 'Accepted') {
                setFriendStatus({ status: 'Friend', isFriend: true, requestId: null });
                setNotification({ type: 'success', text: '✅ Теперь вы друзья!' });
            } else if (status === 'Rejected') {
                setFriendStatus({ status: 'None', isFriend: false, requestId: null });
            }

            setTimeout(() => setNotification(null), 3000);
        };

        // ── Заявка отменена ──
        const handleRequestCanceled = (payload) => {
            const current = foundUserRef.current;
            if (!current) return;

            const { requestId } = payload || {};
            if (!requestId) return;

            // Если в найденном статусе как раз эта заявка — сбрасываем
            setFriendStatus((prev) => {
                if (prev?.requestId === requestId) {
                    return { status: 'None', isFriend: false, requestId: null };
                }
                return prev;
            });
        };

        // ── Стали друзьями (создалась запись Friend) ──
        const handleFriendAdded = (payload) => {
            const current = foundUserRef.current;
            if (!current) return;

            const { senderId, receiverId } = payload || {};

            const involvesFoundUser =
                current.id === senderId || current.id === receiverId;

            if (!involvesFoundUser) return;

            setFriendStatus({ status: 'Friend', isFriend: true, requestId: null });

            // Просим родителя обновить список друзей
            if (onFriendAdded) {
                const otherUser = current;
                onFriendAdded(otherUser);
            }
        };

        // ── Друга удалили ──
        const handleFriendRemoved = (payload) => {
            const current = foundUserRef.current;
            const { userId, friendId } = payload || {};

            // Если в поиске открыт именно этот пользователь — сбрасываем статус
            if (current && (current.id === userId || current.id === friendId)) {
                setFriendStatus({ status: 'None', isFriend: false, requestId: null });
            }

            // Просим родителя обновить список
            if (onFriendRemoved) {
                // Найдём id для удаления — родитель хранит свои объекты,
                // но по контракту MemberCard.key === friend.id (это user.id).
                // Мы не знаем, кого именно нужно удалить из локального массива
                // без точного id. Передаём оба варианта — родитель сам разрулит.
                const removeId = current?.id === userId ? friendId : userId;
                onFriendRemoved(removeId);
            }
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing friend status…');
            // Тихий рефетч статуса найденного пользователя
            const current = foundUserRef.current;
            if (current?.email) {
                getFriendStatus(current.email)
                    .then((status) => setFriendStatus(status))
                    .catch(() => { });
            }
        };

        signalr.on('FriendRequestProcessed', handleRequestProcessed);
        signalr.on('FriendRequestCanceled', handleRequestCanceled);
        signalr.on('FriendAdded', handleFriendAdded);
        signalr.on('FriendRemoved', handleFriendRemoved);
        signalr.on('_reconnected', handleReconnected);

        signalr.connect().catch((err) => {
            console.warn('SignalR connect from FriendsList failed:', err);
        });

        return () => {
            signalr.off('FriendRequestProcessed', handleRequestProcessed);
            signalr.off('FriendRequestCanceled', handleRequestCanceled);
            signalr.off('FriendAdded', handleFriendAdded);
            signalr.off('FriendRemoved', handleFriendRemoved);
            signalr.off('_reconnected', handleReconnected);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

            if (foundUser && foundUser.email === email) {
                setFriendStatus((prev) => ({ ...(prev || {}), status: 'Pending' }));
            }

            setNotification({ type: 'success', text: '✅ Заявка отправлена!' });
            setTimeout(() => setNotification(null), 3000);

            if (onFriendAdded) onFriendAdded(targetUser || foundUser);
        } catch (err) {
            // 🆕 Понятные сообщения для частых кейсов
            const errorText = (err.message || '').toLowerCase();
            let friendlyMessage = err.message || 'Ошибка';

            if (errorText.includes('уже отправил вам заявку')) {
                friendlyMessage = 'Этот пользователь уже отправил вам заявку — проверьте входящие';
                // Обновляем статус на «Received»
                setFriendStatus((prev) => ({ ...(prev || {}), status: 'Received' }));
            } else if (errorText.includes('заявка уже отправлена')) {
                friendlyMessage = 'Заявка уже отправлена';
                setFriendStatus((prev) => ({ ...(prev || {}), status: 'Pending' }));
            } else if (errorText.includes('уже в друзьях')) {
                friendlyMessage = 'Этот пользователь уже в друзьях';
                setFriendStatus({ status: 'Friend', isFriend: true });
            }

            setNotification({ type: 'error', text: friendlyMessage });
            setTimeout(() => setNotification(null), 4000);
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
                    <h3 className="friends-section-title">Найти нового друга</h3>
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
                            className="btn btn--primary btn--sm"
                            disabled={isSearching || !searchEmail.trim()}
                        >
                            {isSearching ? (
                                <>
                                    <Loader2 size={14} className="icon-spin" />
                                    Поиск…
                                </>
                            ) : (
                                <>
                                    <Search size={14} />
                                    Найти
                                </>
                            )}
                        </button>
                    </div>
                    {searchError && (
                        <div className="search-error">
                            <X size={14} />
                            {searchError}
                        </div>
                    )}
                </form>

                <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={handleGoToRequests}
                >
                    <Inbox size={14} />
                    Заявки в друзья
                </button>

                {foundUser && (
                    <div className="search-result">
                        <div className="search-result-header">
                            <span>Результат поиска</span>
                            <button
                                type="button"
                                className="btn btn--ghost btn--icon btn--sm"
                                onClick={clearSearch}
                                title="Очистить"
                                aria-label="Очистить"
                            >
                                <X size={14} />
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
                                <div className="search-result-email">
                                    <Mail size={12} />
                                    {foundUser.email}
                                </div>
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
                                <div className="already-friend">
                                    <Check size={14} />
                                    Уже в друзьях
                                </div>
                            ) : friendStatus?.status === 'Pending' ? (
                                <div className="request-pending">
                                    <Loader2 size={14} />
                                    Заявка отправлена
                                </div>
                            ) : friendStatus?.status === 'Received' ? (
                                <div className="request-received">
                                    <Inbox size={14} />
                                    Вам отправлена заявка
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn--primary btn--sm"
                                    onClick={() => handleSendRequest(foundUser)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={14} className="icon-spin" />
                                            Отправка…
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={14} />
                                            Отправить заявку
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                type="button"
                                className="btn btn--secondary btn--sm"
                                onClick={handleGoToProfile}
                            >
                                <User size={14} />
                                Профиль
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
                    <div className="friends-loading">
                        <Loader2 size={16} className="icon-spin" />
                        Загрузка друзей…
                    </div>
                ) : friends.length === 0 ? (
                    <div className="no-friends">
                        <div className="no-friends-icon">
                            <User size={48} />
                        </div>
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