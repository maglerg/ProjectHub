// projecthub.client/src/components/NotificationsDropdown.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Mail,
    Inbox,
    Loader2,
    UserPlus,
    Check,
    X,
    Users,
    HeartCrack,
    Mail as MailIcon,
    Circle,
} from 'lucide-react';
import { getNotifications, getUnreadCount, markAsRead } from '../services/notificationsApi';
import '../styles/components/NotificationsDropdown.css';

const NotificationsDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadUnreadCount = async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Ошибка загрузки количества:', error);
        }
    };

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await getNotifications();
            if (Array.isArray(data)) {
                setNotifications(data);
            } else {
                setNotifications([]);
            }
            setIsOpen(true);
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        if (!isOpen) {
            loadNotifications();
        } else {
            setIsOpen(false);
        }
    };

    const handleMarkAsRead = async (notificationId = null) => {
        try {
            await markAsRead(notificationId);
            if (notificationId) {
                setNotifications(prev =>
                    prev.map(n =>
                        n.id === notificationId ? { ...n, isRead: true } : n
                    )
                );
            } else {
                setNotifications(prev =>
                    prev.map(n => ({ ...n, isRead: true }))
                );
            }
            setUnreadCount(0);
        } catch (error) {
            console.error('Ошибка отметки прочитанных:', error);
        }
    };

    // 📌 ОБРАБОТЧИК КЛИКА ПО УВЕДОМЛЕНИЮ
    const handleNotificationClick = (notification) => {
        if (!notification) return;

        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }

        // 📌 Проверяем тип уведомления и переходим по ссылке
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
            return;
        }

        // 📌 Заявки в друзья
        if (notification.type === 'FriendRequest' ||
            notification.type === 'FriendRequestReceived' ||
            notification.type === 'FriendRequestAccepted' ||
            notification.type === 'FriendRequestRejected') {
            navigate('/friends/requests');
            setIsOpen(false);
            return;
        }

        // 📌 Приглашения в проект
        if (notification.type === 'ProjectInvitation' ||
            notification.type === 'InvitationAccepted' ||
            notification.type === 'InvitationRejected') {
            navigate('/invitations');
            setIsOpen(false);
            return;
        }
        if (notification.type === 'NewMessage') {
            // Переходим в чат по ссылке
            navigate(notification.link || '/chats');
            setIsOpen(false);
            return;
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);

            if (diff < 60) return 'только что';
            if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
            if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return '';
        }
    };

    // 📌 Получить Lucide-компонент для типа уведомления
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'FriendRequest':
            case 'FriendRequestReceived':
                return UserPlus;
            case 'FriendRequestAccepted':
                return Check;
            case 'FriendRequestRejected':
                return X;
            case 'ApplicationReceived':
                return Inbox;
            case 'ApplicationApproved':
                return Check;
            case 'ApplicationRejected':
                return X;
            case 'NewFriend':
                return Users;
            case 'FriendRemoved':
                return HeartCrack;
            case 'ProjectInvitation':
                return MailIcon;
            case 'InvitationAccepted':
                return Check;
            case 'InvitationRejected':
                return X;
            default:
                return Circle;
        }
    };

    return (
        <div className="notifications-dropdown" ref={dropdownRef}>
            <button
                type="button"
                className="btn btn--ghost btn--icon notification-bell"
                onClick={handleToggle}
                aria-label="Уведомления"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notifications-panel">
                    <div className="notifications-header">
                        <h3>
                            <Mail size={18} />
                            Уведомления
                        </h3>
                        {notifications.some(n => !n.isRead) && (
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => handleMarkAsRead(null)}
                            >
                                Прочитать все
                            </button>
                        )}
                    </div>

                    <div className="notifications-list">
                        {loading ? (
                            <div className="loading-notifications">
                                <Loader2 size={16} className="icon-spin" />
                                Загрузка...
                            </div>
                        ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                            <div className="no-notifications">
                                <span className="no-icon">
                                    <Inbox size={32} />
                                </span>
                                <p>Нет уведомлений</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                if (!notif) return null;

                                const IconComponent = getNotificationIcon(notif.type);

                                return (
                                    <div
                                        key={notif.id || Math.random()}
                                        className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleNotificationClick(notif);
                                            }
                                        }}
                                    >
                                        <div className="notification-icon">
                                            <IconComponent size={18} />
                                        </div>
                                        <div className="notification-content">
                                            <div className="notification-title">{notif.title || 'Уведомление'}</div>
                                            {notif.message && (
                                                <div className="notification-message">{notif.message}</div>
                                            )}
                                            <div className="notification-time">
                                                {formatTime(notif.createdAt)}
                                            </div>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="unread-dot"></div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsDropdown;