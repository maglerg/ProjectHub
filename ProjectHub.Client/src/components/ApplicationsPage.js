// projecthub.client/src/components/ApplicationsPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Inbox,
    Mail,
    Users,
    ClipboardList,
    MessageCircle,
    Calendar,
    RefreshCw,
    Loader2,
    Check,
    X,
    Folder,
    Archive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { searchProjectByCode } from '../services/projectsApi';
import { getApplicationsByCode, processApplication } from '../services/applicationsApi';
import { getUnreadCount } from '../services/notificationsApi';
import { signalr } from '../services/signalrService';
import UserAvatar from './UserAvatar';
import '../styles/components/ApplicationsPage.css';

const ApplicationsPage = ({
    // 🆕 embedded-режим: используется внутри ProjectDashboardPage
    embedded = false,
    projectCode: projectCodeProp = null,
    isArchived: isArchivedProp = null,
    onPendingCountChange = null,
}) => {
    const params = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // 🆕 Код проекта: либо из пропса (embedded), либо из URL
    const code = projectCodeProp || params.code;

    const [project, setProject] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filter, setFilter] = useState('pending');

    // 🆕 Локальный isArchived — синхронизируется с пропом,
    //     но может быть переопределён через SignalR
    const [isArchivedLocal, setIsArchivedLocal] = useState(isArchivedProp === true);
    useEffect(() => {
        if (isArchivedProp !== null) {
            setIsArchivedLocal(isArchivedProp);
        }
    }, [isArchivedProp]);

    const isArchived = isArchivedLocal;

    // 🆕 Ref — чтобы обработчики SignalR видели актуальный userStatus
    const userStatusRef = useRef('NotJoined');

    // ── Загрузка данных ──
    const loadData = useCallback(async (silent = false) => {
        if (!code) {
            setError('Код проекта не указан');
            if (!silent) setLoading(false);
            return;
        }

        if (!silent) {
            setLoading(true);
            setError(null);
        }

        try {
            const projectData = await searchProjectByCode(code);

            if (!projectData) {
                if (!silent) {
                    setError('Проект не найден');
                    setLoading(false);
                }
                return;
            }

            setProject(projectData);

            const userStatus = projectData.userStatus || 'NotJoined';
            userStatusRef.current = userStatus;

            if (userStatus !== 'Owner' && userStatus !== 'Admin') {
                if (!silent) {
                    setError('У вас нет прав для просмотра заявок');
                    setLoading(false);
                }
                return;
            }

            await loadApplications(code, silent);
        } catch (err) {
            console.error('❌ Ошибка загрузки:', err);
            if (!silent) {
                setError(err.message || 'Ошибка загрузки данных');
                setLoading(false);
            }
        }

        // Обновляем счётчик уведомлений (только в standalone-режиме,
        // чтобы не спамить при embedded)
        if (!embedded) {
            try {
                await getUnreadCount();
            } catch (err) {
                console.warn('Не удалось обновить счётчик:', err);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, embedded]);

    const loadApplications = async (projectCode, silent = false) => {
        try {
            if (!projectCode) {
                setApplications([]);
                if (!silent) setLoading(false);
                return;
            }

            const data = await getApplicationsByCode(projectCode);

            if (Array.isArray(data)) {
                setApplications(data);
            } else {
                console.warn('⚠️ Получены не массив:', data);
                setApplications([]);
            }
        } catch (err) {
            console.error('❌ Ошибка загрузки заявок:', err);
            if (!silent) setError(err.message || 'Ошибка загрузки заявок');
            setApplications([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: подписки на события заявок и архивацию проекта.
    //     JoinProject/LeaveProject делаем только в standalone-режиме,
    //     в embedded — их делает родитель (ProjectDashboardPage).
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!code) return;

        let cancelled = false;

        // ── Новая заявка подана ──
        const handleApplicationCreated = (application) => {
            if (!application?.id) return;

            const status = userStatusRef.current;
            if (status !== 'Owner' && status !== 'Admin') return;

            setApplications((prev) => {
                if (prev.some((a) => a.id === application.id)) return prev;
                return [application, ...prev];
            });

            setSuccess('📨 Новая заявка!');
            setTimeout(() => setSuccess(null), 3000);
        };

        // ── Заявка обработана ──
        const handleApplicationProcessed = (payload) => {
            const applicationId = payload?.applicationId;
            if (!applicationId) return;

            setApplications((prev) =>
                prev.filter((a) => a.id !== applicationId)
            );
        };

        // ── Заявка отменена ──
        const handleApplicationCanceled = (payload) => {
            const applicationId = payload?.applicationId;
            if (!applicationId) return;

            setApplications((prev) =>
                prev.filter((a) => a.id !== applicationId)
            );
        };

        // ── Проект архивирован ──
        const handleProjectArchived = (payload) => {
            if (!payload?.publicCode) return;
            if (payload.publicCode !== code) return;

            setIsArchivedLocal(true);
            setApplications([]);

            setSuccess('📦 Проект в архиве — заявки отменены');
            setTimeout(() => setSuccess(null), 4000);
        };

        // ── Проект восстановлен ──
        const handleProjectUnarchived = (payload) => {
            if (!payload?.publicCode) return;
            if (payload.publicCode !== code) return;

            setIsArchivedLocal(false);

            setSuccess('↩️ Проект восстановлен из архива');
            setTimeout(() => setSuccess(null), 3000);
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing applications…');

            // JoinProject только в standalone-режиме
            if (!embedded) {
                signalr.invoke('JoinProject', code).catch(() => { });
            }

            loadData(true);
        };

        signalr.on('ApplicationCreated', handleApplicationCreated);
        signalr.on('ApplicationProcessed', handleApplicationProcessed);
        signalr.on('ApplicationCanceled', handleApplicationCanceled);
        signalr.on('ProjectArchived', handleProjectArchived);
        signalr.on('ProjectUnarchived', handleProjectUnarchived);
        signalr.on('_reconnected', handleReconnected);

        // JoinProject — только если это standalone-страница.
        // В embedded это уже делает родитель.
        if (!embedded) {
            (async () => {
                try {
                    await signalr.connect();
                    if (cancelled) return;
                    await signalr.invoke('JoinProject', code);
                    console.log(`✅ ApplicationsPage joined project:${code}`);
                } catch (err) {
                    console.warn('SignalR: не удалось присоединиться к проекту:', err);
                }
            })();
        }

        return () => {
            cancelled = true;

            signalr.off('ApplicationCreated', handleApplicationCreated);
            signalr.off('ApplicationProcessed', handleApplicationProcessed);
            signalr.off('ApplicationCanceled', handleApplicationCanceled);
            signalr.off('ProjectArchived', handleProjectArchived);
            signalr.off('ProjectUnarchived', handleProjectUnarchived);
            signalr.off('_reconnected', handleReconnected);

            // LeaveProject — только в standalone-режиме
            if (!embedded) {
                signalr.invoke('LeaveProject', code).catch(() => { });
                console.log(`👋 ApplicationsPage left project:${code}`);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, embedded]);

    // ── Обработка заявки ──
    const handleProcess = async (applicationId, approve) => {
        if (!applicationId) {
            setError('Ошибка: ID заявки не найден');
            return;
        }

        setProcessing(applicationId);
        setError(null);
        setSuccess(null);

        try {
            await processApplication(applicationId, approve);
            setSuccess(approve ? '✅ Заявка одобрена!' : '❌ Заявка отклонена');

            if (!signalr.isConnected()) {
                await loadApplications(code);
                await loadData(true);
            } else {
                setApplications((prev) =>
                    prev.filter((a) => a.id !== applicationId)
                );
            }
        } catch (err) {
            console.error('❌ Ошибка обработки:', err);
            setError(err.message || 'Ошибка обработки заявки');
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending':
                return (
                    <span className="status-badge pending">
                        <Loader2 size={12} />
                        Ожидает
                    </span>
                );
            case 'Approved':
                return (
                    <span className="status-badge approved">
                        <Check size={12} />
                        Одобрена
                    </span>
                );
            case 'Rejected':
                return (
                    <span className="status-badge rejected">
                        <X size={12} />
                        Отклонена
                    </span>
                );
            default:
                return <span className="status-badge">{status || 'Неизвестно'}</span>;
        }
    };

    const safeApplications = Array.isArray(applications) ? applications : [];

    // 🆕 Уведомляем родителя о счётчике pending-заявок
    useEffect(() => {
        if (onPendingCountChange) {
            const pendingCount = safeApplications.filter(
                a => a.status === 'Pending'
            ).length;
            onPendingCountChange(pendingCount);
        }
    }, [safeApplications, onPendingCountChange]);

    const filteredApplications = safeApplications.filter(app => {
        if (filter === 'pending') return app.status === 'Pending';
        if (filter === 'approved') return app.status === 'Approved';
        if (filter === 'rejected') return app.status === 'Rejected';
        return true;
    });

    if (loading) {
        return (
            <div className="applications-loading">
                <div className="spinner">
                    <Loader2 size={32} className="icon-spin" />
                </div>
                <p>Загрузка заявок...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="applications-error">
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

    if (!project) {
        return (
            <div className="applications-not-found">
                <div className="not-found-icon">
                    <Inbox size={32} />
                </div>
                <h3>Проект не найден</h3>
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
        <div className={embedded ? 'applications-page applications-page--embedded' : 'applications-page'}>
            {/* 🆕 Хедер только в standalone-режиме */}
            {!embedded && (
                <header className="applications-header">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => navigate(`/projects/${code}`)}
                    >
                        <ArrowLeft size={16} />
                        Назад к проекту
                    </button>
                    <h1>
                        <Mail size={24} />
                        Заявки на вступление
                    </h1>
                    <span className="project-name">{project.name || 'Без названия'}</span>
                </header>
            )}

            {/* Плашка «архив» — и в standalone, и в embedded */}
            {isArchived && (
                <div className="archive-banner">
                    <Archive size={16} />
                    Проект в архиве — заявки отменены, действия недоступны.
                </div>
            )}

            <div className="applications-content">
                {/* 🆕 Info-bar только в standalone-режиме */}
                {!embedded && (
                    <div className="project-info-bar">
                        <span>
                            <Folder size={14} />
                            Код: <strong>{project.publicCode || '—'}</strong>
                        </span>
                        <span>
                            <Users size={14} />
                            Участников: <strong>{project.members?.length || 0}</strong>
                        </span>
                        <span>
                            <ClipboardList size={14} />
                            Всего заявок: <strong>{safeApplications.length}</strong>
                        </span>
                    </div>
                )}

                <div className="applications-filters">
                    <button
                        type="button"
                        className={`btn btn--sm applications-filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        <Loader2 size={14} />
                        Ожидают ({safeApplications.filter(a => a.status === 'Pending').length})
                    </button>
                    <button
                        type="button"
                        className={`btn btn--sm applications-filter-btn ${filter === 'approved' ? 'active' : ''}`}
                        onClick={() => setFilter('approved')}
                    >
                        <Check size={14} />
                        Одобрены ({safeApplications.filter(a => a.status === 'Approved').length})
                    </button>
                    <button
                        type="button"
                        className={`btn btn--sm applications-filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                        onClick={() => setFilter('rejected')}
                    >
                        <X size={14} />
                        Отклонены ({safeApplications.filter(a => a.status === 'Rejected').length})
                    </button>
                    <button
                        type="button"
                        className={`btn btn--sm applications-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        <ClipboardList size={14} />
                        Все ({safeApplications.length})
                    </button>
                </div>

                {success && (
                    <div className="success-message">{success}</div>
                )}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                <div className="applications-list">
                    {filteredApplications.length === 0 ? (
                        <div className="no-applications">
                            <div className="no-icon">
                                <Inbox size={32} />
                            </div>
                            <p>
                                {filter === 'pending' ? 'Нет ожидающих заявок' :
                                    filter === 'approved' ? 'Нет одобренных заявок' :
                                        filter === 'rejected' ? 'Нет отклоненных заявок' :
                                            'Нет заявок'}
                            </p>
                        </div>
                    ) : (
                        filteredApplications.map(app => (
                            <div key={app.id} className="application-card">
                                <div className="application-header">
                                    <div className="user-info">
                                        <UserAvatar
                                            avatarUrl={app.userAvatarUrl}
                                            name={app.userName}
                                            email={app.userEmail}
                                            size="md"
                                        />
                                        <div className="user-details">
                                            <span className="user-name">{app.userName || 'Неизвестно'}</span>
                                            <span className="user-email">{app.userEmail || '—'}</span>
                                            {app.userSpecialization && (
                                                <span className="user-specialization">
                                                    {app.userSpecialization}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="application-status">
                                        {getStatusBadge(app.status)}
                                    </div>
                                </div>

                                {app.message && (
                                    <div className="application-message">
                                        <MessageCircle size={14} />
                                        <span>{app.message}</span>
                                    </div>
                                )}

                                <div className="application-meta">
                                    <span>
                                        <Calendar size={12} />
                                        {formatDate(app.createdAt)}
                                    </span>
                                    {app.processedAt && (
                                        <span>
                                            <RefreshCw size={12} />
                                            {formatDate(app.processedAt)}
                                        </span>
                                    )}
                                </div>

                                {app.status === 'Pending' && !isArchived && (
                                    <div className="application-actions">
                                        <button
                                            type="button"
                                            className="btn btn--primary btn--sm"
                                            onClick={() => handleProcess(app.id, true)}
                                            disabled={processing === app.id}
                                        >
                                            {processing === app.id ? (
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
                                            onClick={() => handleProcess(app.id, false)}
                                            disabled={processing === app.id}
                                        >
                                            {processing === app.id ? (
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
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApplicationsPage;