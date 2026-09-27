// projecthub.client/src/components/InviteUserModal.js

import React, { useState } from 'react';
import {
    Mail,
    X,
    Search,
    Loader2,
    User,
    Check,
    UserPlus,
} from 'lucide-react';
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
    // 📌 Отправить приглашение (используем publicCode)
    const handleSendInvitation = async () => {
        if (!foundUser || !project?.publicCode) {
            console.error('❌ Нет publicCode проекта');
            return;
        }

        if (isSending) return;

        setIsSending(true);
        setNotification(null);

        try {
            await createInvitationByCode(project.publicCode, foundUser.email, message);
            setIsInvited(true);
            setNotification({ type: 'success', text: '✅ Приглашение отправлено!' });

            if (onInvitationSent) {
                onInvitationSent();
            }
        } catch (err) {
            const errorText = (err.message || '').toLowerCase();

            // 🆕 Понятные сообщения для частых кейсов
            let friendlyMessage;

            if (
                errorText.includes('уже отправлено') ||
                errorText.includes('уже приглашён') ||
                errorText.includes('already')
            ) {
                friendlyMessage = 'Этот пользователь уже приглашён в проект';
            } else if (
                errorText.includes('уже является участником') ||
                errorText.includes('already a member')
            ) {
                friendlyMessage = 'Пользователь уже является участником проекта';
            } else if (
                errorText.includes('нет прав') ||
                errorText.includes('доступ')
            ) {
                friendlyMessage = 'У вас нет прав приглашать участников';
            } else {
                friendlyMessage = err.message || 'Ошибка отправки приглашения';
            }

            setNotification({ type: 'error', text: friendlyMessage });
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
                    <h2>
                        <Mail size={20} />
                        Пригласить в проект
                    </h2>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        <X size={16} />
                    </button>
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
                            <button
                                type="submit"
                                className="btn btn--primary btn--sm"
                                disabled={isSearching || !email.trim() || isInvited}
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

                    {/* 📌 Найденный пользователь */}
                    {foundUser && !isInvited && (
                        <div className="found-user-card">
                            <div className="found-user-avatar">
                                {foundUser.name
                                    ? foundUser.name[0].toUpperCase()
                                    : <User size={20} />}
                            </div>
                            <div className="found-user-info">
                                <div className="found-user-name">{foundUser.name}</div>
                                <div className="found-user-email">
                                    <Mail size={12} />
                                    {foundUser.email}
                                </div>
                                <div className="found-user-specialization">
                                    {foundUser.specialization || '—'}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn--ghost btn--icon btn--sm"
                                onClick={clearSearch}
                                aria-label="Очистить"
                                title="Очистить"
                            >
                                <X size={14} />
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
                            <div className="invite-success-icon">
                                <Check size={48} />
                            </div>
                            <h3>Приглашение отправлено!</h3>
                            <p>Пользователь получит уведомление</p>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={clearSearch}
                            >
                                <UserPlus size={16} />
                                Пригласить еще
                            </button>
                        </div>
                    )}

                    {/* 📌 Кнопки действий */}
                    {foundUser && !isInvited && (
                        <div className="invite-actions">
                            <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={clearSearch}
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleSendInvitation}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 size={16} className="icon-spin" />
                                        Отправка...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} />
                                        Отправить приглашение
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

export default InviteUserModal;