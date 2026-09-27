// projecthub.client/src/components/InvitationsPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { signalr } from '../services/signalrService';
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

    // 🆕 Ref — чтобы обработчики SignalR видели актуальный userId
    // без пересоздания подписок.
    const userIdRef = useRef(null);
    useEffect(() => {
        userIdRef.current = user?.id || user?.userId || null;
    }, [user]);

    // 🆕 Ref для актуального списка (чтобы в обработчике не тянуть из замыкания)
    const invitationsRef = useRef(invitations);
    useEffect(() => { invitationsRef.current = invitations; }, [invitations]);

    // ── Загрузка ──
    const loadInvitations = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const data = await getInvitations();
            setInvitations(data || []);
        } catch (err) {
            console.error('Ошибка загрузки приглашений:', err);
            if (!silent) setError(err.message || 'Ошибка загрузки приглашений');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInvitations();
    }, [loadInvitations]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: подписки на InvitationCreated / InvitationProcessed /
    //     InvitationCanceled
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        // ── Новое приглашение пришло мне ──
        const handleInvitationCreated = (invitation) => {
            if (!invitation?.id) return;

            // Проверяем, что это действительно мне:
            // бэк эмитит в user:{inviteeId}, но защищаемся от лишнего.
            const currentUserId = userIdRef.current;
            const currentEmail = user?.email?.toLowerCase();

            const isForMe =
                (currentUserId && invitation.inviteeId === currentUserId) ||
                (currentEmail && invitation.inviteeEmail?.toLowerCase() === currentEmail);

            if (!isForMe) return;

            setInvitations((prev) => {
                // Защита от дублей
                if (prev.some((i) => i.id === invitation.id)) return prev;
                // Новая сверху
                return [invitation, ...prev];
            });

            setSuccess('📩 Новое приглашение!');
            setTimeout(() => setSuccess(null), 3000);
        };

        // ── Приглашение обработано (мной в другой вкладке, или истекло) ──
        const handleInvitationProcessed = (payload) => {
            const invitationId = payload?.invitationId;
            if (!invitationId) return;

            setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        };

        // 🆕 ── Приглашение отменено (проект архивирован и т.п.) ──
        const handleInvitationCanceled = (payload) => {
            const invitationId = payload?.invitationId;
            if (!invitationId) return;

            setInvitations((prev) => prev.filter((i) => i.id !== invitationId));

            if (payload.projectName) {
                setSuccess(`📦 Приглашение в «${payload.projectName}» отменено — проект архивирован`);
                setTimeout(() => setSuccess(null), 4000);
            }
        };

        // ── Реконнект: тихо перезагружаем список ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing invitations…');
            loadInvitations(true);
        };

        signalr.on('InvitationCreated', handleInvitationCreated);
        signalr.on('InvitationProcessed', handleInvitationProcessed);
        signalr.on('InvitationCanceled', handleInvitationCanceled);
        signalr.on('_reconnected', handleReconnected);

        // На случай, если соединение ещё не поднято
        signalr.connect().catch((err) => {
            console.warn('SignalR connect from InvitationsPage failed:', err);
        });

        return () => {
            signalr.off('InvitationCreated', handleInvitationCreated);
            signalr.off('InvitationProcessed', handleInvitationProcessed);
            signalr.off('InvitationCanceled', handleInvitationCanceled);
            signalr.off('_reconnected', handleReconnected);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadInvitations, user?.email]);

    // ── Обработка приглашения ──
    const handleProcess = async (invitationId, accept) => {
        if (processing) return;

        setProcessing(invitationId);
        setError(null);
        setSuccess(null);

        // Запоминаем для редиректа, до удаления из стейта
        const acceptedInvitation = invitationsRef.current.find(
            (i) => i.id === invitationId
        );

        try {
            await processInvitation(invitationId, accept);

            setSuccess(accept ? '✅ Приглашение принято!' : '❌ Приглашение отклонено');

            // Убираем карточку локально — мгновенный отклик.
            // Если SignalR подключён — InvitationProcessed придёт и всё равно
            // уберёт (идемпотентно). Если нет — мы уже убрали.
            setInvitations((prev) =>
                prev.filter((i) => i.id !== invitationId)
            );

            // Принято — редирект в проект
            if (accept && acceptedInvitation?.projectCode) {
                setTimeout(() => {
                    navigate(`/projects/${acceptedInvitation.projectCode}/dashboard`);
                }, 1500);
            }
        } catch (err) {
            console.error('Ошибка обработки приглашения:', err);
            setError(err.message || 'Ошибка обработки приглашения');
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
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