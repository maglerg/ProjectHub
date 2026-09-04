// projecthub.client/src/components/NotificationsDropdown.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
            // 📌 ЗАЩИТА: проверяем, что data — массив
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

    const handleNotificationClick = (notification) => {
        // 📌 ЗАЩИТА: проверяем, что notification существует
        if (!notification) return;

        if (!notification.isRead) {
            handleMarkAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
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

    return (
        <div className="notifications-dropdown" ref={dropdownRef}>
            <button
                className="notification-bell"
                onClick={handleToggle}
                aria-label="Уведомления"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notifications-panel">
                    <div className="notifications-header">
                        <h3>📨 Уведомления</h3>
                        {notifications.some(n => !n.isRead) && (
                            <button
                                className="mark-all-read"
                                onClick={() => handleMarkAsRead(null)}
                            >
                                Прочитать все
                            </button>
                        )}
                    </div>

                    <div className="notifications-list">
                        {loading ? (
                            <div className="loading-notifications">⏳ Загрузка...</div>
                        ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                            <div className="no-notifications">
                                <span className="no-icon">📭</span>
                                <p>Нет уведомлений</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                // 📌 ЗАЩИТА: проверяем, что notif существует
                                if (!notif) return null;

                                return (
                                    <div
                                        key={notif.id || Math.random()}
                                        className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
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