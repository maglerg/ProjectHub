// projecthub.client/src/components/InviteUserModal.js

import React, { useState } from 'react';
import { getUserProfileByEmail } from '../services/userApi';
import { createInvitationByCode } from '../services/invitationsApi';
import '../styles/components/InviteUserModal.css';

const InviteUserModal = ({ project, onClose, onInvitationSent }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [notification, setNotification] = useState(null);
    const [isInvited, setIsInvited] = useState(false);

    console.log('📦 Проект в модалке:', project);
    console.log('📦 Публичный код проекта:', project?.publicCode);

    // 📌 Поиск пользователя
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setSearchError('Введите email');
            return;
        }

        setIsSearching(true);
        setSearchError('');
        setFoundUser(null);
        setNotification(null);

        try {
            const user = await getUserProfileByEmail(email);
            if (user) {
                setFoundUser(user);
            } else {
                setSearchError('Пользователь не найден');
            }
        } catch (err) {
            setSearchError(err.message || 'Ошибка поиска пользователя');
        } finally {
            setIsSearching(false);
        }
    };

    // 📌 Отправить приглашение (используем publicCode)
    const handleSendInvitation = async () => {
        if (!foundUser || !project?.publicCode) {
            console.error('❌ Нет publicCode проекта');
            return;
        }

        setIsSending(true);
        setNotification(null);

        try {
            // ✅ Используем publicCode вместо project.id
            await createInvitationByCode(project.publicCode, foundUser.email, message);
            setIsInvited(true);
            setNotification({ type: 'success', text: '✅ Приглашение отправлено!' });

            if (onInvitationSent) {
                onInvitationSent();
            }
        } catch (err) {
            setNotification({ type: 'error', text: '❌ ' + (err.message || 'Ошибка отправки') });
        } finally {
            setIsSending(false);
        }
    };

    // 📌 Очистить результаты
    const clearSearch = () => {
        setFoundUser(null);
        setEmail('');
        setSearchError('');
        setNotification(null);
        setIsInvited(false);
        setMessage('');
    };

    return (
        <div className="invite-modal-overlay" onClick={onClose}>
            <div className="invite-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="invite-modal-header">
                    <h2>📩 Пригласить в проект</h2>
                    <button className="invite-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="invite-modal-body">
                    {/* 📌 Поиск пользователя */}
                    <form className="search-user-form" onSubmit={handleSearch}>
                        <div className="search-user-input-group">
                            <input
                                type="email"
                                placeholder="Введите email пользователя"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSearching || isInvited}
                            />
                            <button type="submit" disabled={isSearching || !email.trim() || isInvited}>
                                {isSearching ? '⏳' : '🔍 Найти'}
                            </button>
                        </div>
                        {searchError && <div className="search-error">❌ {searchError}</div>}
                    </form>

                    {/* 📌 Найденный пользователь */}
                    {foundUser && !isInvited && (
                        <div className="found-user-card">
                            <div className="found-user-avatar">
                                {foundUser.name ? foundUser.name[0].toUpperCase() : '👤'}
                            </div>
                            <div className="found-user-info">
                                <div className="found-user-name">{foundUser.name}</div>
                                <div className="found-user-email">{foundUser.email}</div>
                                <div className="found-user-specialization">
                                    {foundUser.specialization || '—'}
                                </div>
                            </div>
                            <button className="clear-search-btn" onClick={clearSearch}>
                                ✕
                            </button>
                        </div>
                    )}

                    {/* 📌 Сообщение для приглашения */}
                    {foundUser && !isInvited && (
                        <div className="invite-message-section">
                            <label>Сообщение (необязательно)</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Напишите сообщение пользователю..."
                                rows="3"
                                disabled={isSending}
                            />
                        </div>
                    )}

                    {/* 📌 Уведомления */}
                    {notification && (
                        <div className={`invite-notification ${notification.type}`}>
                            {notification.text}
                        </div>
                    )}

                    {/* 📌 Приглашение отправлено */}
                    {isInvited && (
                        <div className="invite-success">
                            <div className="invite-success-icon">✅</div>
                            <h3>Приглашение отправлено!</h3>
                            <p>Пользователь получит уведомление</p>
                            <button className="btn-invite-another" onClick={clearSearch}>
                                ➕ Пригласить еще
                            </button>
                        </div>
                    )}

                    {/* 📌 Кнопки действий */}
                    {foundUser && !isInvited && (
                        <div className="invite-actions">
                            <button className="btn-cancel" onClick={clearSearch}>
                                Отмена
                            </button>
                            <button
                                className="btn-send-invite"
                                onClick={handleSendInvitation}
                                disabled={isSending}
                            >
                                {isSending ? '⏳ Отправка...' : '📩 Отправить приглашение'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteUserModal;