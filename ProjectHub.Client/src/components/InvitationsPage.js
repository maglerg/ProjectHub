// projecthub.client/src/components/InvitationsPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInvitations, processInvitation } from '../services/invitationsApi';
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
                <div className="spinner">⏳</div>
                <p>Загрузка приглашений...</p>
            </div>
        );
    }

    if (error && invitations.length === 0) {
        return (
            <div className="invitations-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    return (
        <div className="invitations-page">
            <header className="invitations-header">
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Назад
                </button>
                <h1>📩 Приглашения</h1>
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
                        <div className="no-icon">📭</div>
                        <h3>Нет приглашений</h3>
                        <p>У вас нет активных приглашений в проекты</p>
                    </div>
                ) : (
                    <div className="invitations-list">
                        {invitations.map(inv => (
                            <div key={inv.id} className="invitation-card">
                                <div className="invitation-header">
                                    <div className="invitation-project">
                                        <div className="invitation-project-icon">📁</div>
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
                                        <span className="status-badge pending">⏳ Ожидает</span>
                                    </div>
                                </div>

                                <div className="invitation-details">
                                    <div className="invitation-from">
                                        <span className="label">От:</span>
                                        <span className="value">{inv.inviterName}</span>
                                        <span className="email">({inv.inviterEmail})</span>
                                    </div>
                                    <div className="invitation-time">
                                        📅 {formatDate(inv.createdAt)}
                                    </div>
                                    {inv.message && (
                                        <div className="invitation-message">
                                            💬 {inv.message}
                                        </div>
                                    )}
                                </div>

                                <div className="invitation-actions">
                                    <button
                                        className="btn-accept"
                                        onClick={() => handleProcess(inv.id, true)}
                                        disabled={processing === inv.id}
                                    >
                                        {processing === inv.id ? '⏳' : '✅ Принять'}
                                    </button>
                                    <button
                                        className="btn-reject"
                                        onClick={() => handleProcess(inv.id, false)}
                                        disabled={processing === inv.id}
                                    >
                                        {processing === inv.id ? '⏳' : '❌ Отклонить'}
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