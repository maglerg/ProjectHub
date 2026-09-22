// projecthub.client/src/components/InvitationsPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Loader2,
    X,
    Check,
    Inbox,
    Folder,
    Calendar,
    MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInvitations, processInvitation } from '../services/invitationsApi';
import UserAvatar from './UserAvatar';
import '../styles/components/InvitationsPage.css';

const InvitationsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getInvitations();
            setInvitations(data || []);
        } catch (err) {
            setError(err.message || 'Ошибка загрузки приглашений');
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (invitationId, accept) => {
        setProcessing(invitationId);
        setError(null);
        setSuccess(null);

        try {
            await processInvitation(invitationId, accept);
            setSuccess(accept ? '✅ Приглашение принято!' : '❌ Приглашение отклонено');

            await loadInvitations();

            // Если принято — перенаправляем в проект
            if (accept) {
                const accepted = invitations.find(i => i.id === invitationId);
                if (accepted) {
                    setTimeout(() => {
                        navigate(`/projects/${accepted.projectCode}/dashboard`);
                    }, 1500);
                }
            }
        } catch (err) {
            setError(err.message || 'Ошибка обработки приглашения');
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="invitations-loading">
                <div className="spinner">
                    <Loader2 size={32} className="icon-spin" />
                </div>
                <p>Загрузка приглашений...</p>
            </div>
        );
    }

    if (error && invitations.length === 0) {
        return (
            <div className="invitations-error">
                <div className="error-icon">
                    <X size={32} />
                </div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Вернуться к проектам
                </button>
            </div>
        );
    }

    return (
        <div className="invitations-page">
            <header className="invitations-header">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>
                <h1>
                    <Mail size={24} />
                    Приглашения
                </h1>
                <span className="invitations-count">{invitations.length}</span>
            </header>

            <div className="invitations-content">
                {success && (
                    <div className="success-message">{success}</div>
                )}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                {invitations.length === 0 ? (
                    <div className="no-invitations">
                        <div className="no-icon">
                            <Inbox size={32} />
                        </div>
                        <h3>Нет приглашений</h3>
                        <p>У вас нет активных приглашений в проекты</p>
                    </div>
                ) : (
                    <div className="invitations-list">
                        {invitations.map(inv => (
                            <div key={inv.id} className="invitation-card">
                                <div className="invitation-header">
                                    <div className="invitation-project">
                                        <div className="invitation-project-icon">
                                            <Folder size={20} />
                                        </div>
                                        <div className="invitation-project-info">
                                            <div className="invitation-project-name">
                                                {inv.projectName}
                                            </div>
                                            <div className="invitation-project-code">
                                                Код: {inv.projectCode}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="invitation-status">
                                        <span className="status-badge pending">
                                            <Loader2 size={12} />
                                            Ожидает
                                        </span>
                                    </div>
                                </div>

                                {/* 🆕 Блок «От кого» — с аватаром */}
                                <div className="invitation-details">
                                    <div className="invitation-from">
                                        <UserAvatar
                                            avatarUrl={inv.inviterAvatarUrl}
                                            name={inv.inviterName}
                                            email={inv.inviterEmail}
                                            size="sm"
                                        />
                                        <div className="invitation-from-info">
                                            <div className="invitation-from-label">От:</div>
                                            <div className="invitation-from-name">
                                                {inv.inviterName}
                                            </div>
                                            <div className="invitation-from-email">
                                                {inv.inviterEmail}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="invitation-time">
                                        <Calendar size={12} />
                                        {formatDate(inv.createdAt)}
                                    </div>
                                    {inv.message && (
                                        <div className="invitation-message">
                                            <MessageCircle size={12} />
                                            {inv.message}
                                        </div>
                                    )}
                                </div>

                                <div className="invitation-actions">
                                    <button
                                        type="button"
                                        className="btn btn--primary btn--sm"
                                        onClick={() => handleProcess(inv.id, true)}
                                        disabled={processing === inv.id}
                                    >
                                        {processing === inv.id ? (
                                            <>
                                                <Loader2 size={14} className="icon-spin" />
                                                Обработка…
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
                                        onClick={() => handleProcess(inv.id, false)}
                                        disabled={processing === inv.id}
                                    >
                                        {processing === inv.id ? (
                                            <>
                                                <Loader2 size={14} className="icon-spin" />
                                                Обработка…
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitationsPage;