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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { searchProjectByCode } from '../services/projectsApi';
import { getApplicationsByCode, processApplication } from '../services/applicationsApi';
import { getUnreadCount } from '../services/notificationsApi';
import { signalr } from '../services/signalrService';
import UserAvatar from './UserAvatar';
import '../styles/components/ApplicationsPage.css';

const ApplicationsPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filter, setFilter] = useState('pending');

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

        // Обновляем счётчик уведомлений
        try {
            await getUnreadCount();
        } catch (err) {
            console.warn('Не удалось обновить счётчик:', err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

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
    //  🆕 SIGNALR: JoinProject + подписки на события заявок.
    //     Страница /projects/:code/applications — отдельный маршрут,
    //     поэтому JoinProject делает сама.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!code) return;

        let cancelled = false;

        // ── Новая заявка подана ──
        const handleApplicationCreated = (application) => {
            if (!application?.id) return;

            // Показываем только owner'у и админам
            const status = userStatusRef.current;
            if (status !== 'Owner' && status !== 'Admin') return;

            setApplications((prev) => {
                // Защита от дублей
                if (prev.some((a) => a.id === application.id)) return prev;
                // Добавляем в начало — там сортировка по CreatedAt desc
                return [application, ...prev];
            });

            setSuccess('📨 Новая заявка!');
            setTimeout(() => setSuccess(null), 3000);
        };

        // ── Заявка обработана (одобрена/отклонена) ──
        const handleApplicationProcessed = (payload) => {
            const applicationId = payload?.applicationId;
            if (!applicationId) return;

            setApplications((prev) =>
                prev.filter((a) => a.id !== applicationId)
            );
        };

        // ── Reconnect — перезагружаем всё ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing applications…');
            signalr.invoke('JoinProject', code).catch(() => { });
            loadData(true);
        };

        signalr.on('ApplicationCreated', handleApplicationCreated);
        signalr.on('ApplicationProcessed', handleApplicationProcessed);
        signalr.on('_reconnected', handleReconnected);

        // JoinProject — страница отдельная, делаем сами
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

        return () => {
            cancelled = true;

            signalr.off('ApplicationCreated', handleApplicationCreated);
            signalr.off('ApplicationProcessed', handleApplicationProcessed);
            signalr.off('_reconnected', handleReconnected);

            signalr.invoke('LeaveProject', code).catch(() => { });
            console.log(`👋 ApplicationsPage left project:${code}`);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

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

            // Если SignalR не подключён — обновляем вручную.
            // Если подключён — придёт ApplicationProcessed и уберёт из списка,
            // но всё равно перезагружаем для актуальности.
            if (!signalr.isConnected()) {
                await loadApplications(code);
                await loadData();
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
        <div className="applications-page">
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

            <div className="applications-content">
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

                                {app.status === 'Pending' && (
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