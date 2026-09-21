// projecthub.client/src/components/ApplicationsPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchProjectByCode } from '../services/projectsApi';
import { getApplicationsByCode, processApplication } from '../services/applicationsApi';
import { getUnreadCount } from '../services/notificationsApi';
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

    useEffect(() => {
        if (code) {
            loadData();
        } else {
            setError('Код проекта не указан');
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const projectData = await searchProjectByCode(code);

            if (!projectData) {
                setError('Проект не найден');
                setLoading(false);
                return;
            }

            setProject(projectData);

            const userStatus = projectData.userStatus || 'NotJoined';

            if (userStatus !== 'Owner' && userStatus !== 'Admin') {
                setError('У вас нет прав для просмотра заявок');
                setLoading(false);
                return;
            }

            await loadApplications(code);
        } catch (err) {
            console.error('❌ Ошибка загрузки:', err);
            setError(err.message || 'Ошибка загрузки данных');
            setLoading(false);
        }

        // Обновляем счётчик уведомлений
        try {
            await getUnreadCount();
        } catch (err) {
            console.warn('Не удалось обновить счётчик:', err);
        }
    };

    const loadApplications = async (projectCode) => {
        try {
            if (!projectCode) {
                setApplications([]);
                setLoading(false);
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
            setError(err.message || 'Ошибка загрузки заявок');
            setApplications([]);
        } finally {
            setLoading(false);
        }
    };

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

            await loadApplications(code);
            await loadData();
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
                return <span className="status-badge pending">⏳ Ожидает</span>;
            case 'Approved':
                return <span className="status-badge approved">✅ Одобрена</span>;
            case 'Rejected':
                return <span className="status-badge rejected">❌ Отклонена</span>;
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
                <div className="spinner">⏳</div>
                <p>Загрузка заявок...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="applications-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="applications-not-found">
                <div className="not-found-icon">📭</div>
                <h3>Проект не найден</h3>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    return (
        <div className="applications-page">
            <header className="applications-header">
                <button className="btn-back" onClick={() => navigate(`/projects/${code}`)}>
                    ← Назад к проекту
                </button>
                <h1>📨 Заявки на вступление</h1>
                <span className="project-name">{project.name || 'Без названия'}</span>
            </header>

            <div className="applications-content">
                <div className="project-info-bar">
                    <span>📂 Код: <strong>{project.publicCode || '—'}</strong></span>
                    <span>👥 Участников: <strong>{project.members?.length || 0}</strong></span>
                    <span>📋 Всего заявок: <strong>{safeApplications.length}</strong></span>
                </div>

                <div className="applications-filters">
                    <button
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        ⏳ Ожидают ({safeApplications.filter(a => a.status === 'Pending').length})
                    </button>
                    <button
                        className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                        onClick={() => setFilter('approved')}
                    >
                        ✅ Одобрены ({safeApplications.filter(a => a.status === 'Approved').length})
                    </button>
                    <button
                        className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                        onClick={() => setFilter('rejected')}
                    >
                        ❌ Отклонены ({safeApplications.filter(a => a.status === 'Rejected').length})
                    </button>
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        📋 Все ({safeApplications.length})
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
                            <div className="no-icon">📭</div>
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
                                        {/* 🆕 Аватар заявителя */}
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
                                        💬 <span>{app.message}</span>
                                    </div>
                                )}

                                <div className="application-meta">
                                    <span>📅 {formatDate(app.createdAt)}</span>
                                    {app.processedAt && (
                                        <span>🔄 {formatDate(app.processedAt)}</span>
                                    )}
                                </div>

                                {app.status === 'Pending' && (
                                    <div className="application-actions">
                                        <button
                                            className="btn-approve"
                                            onClick={() => handleProcess(app.id, true)}
                                            disabled={processing === app.id}
                                        >
                                            {processing === app.id ? '⏳' : '✅ Принять'}
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleProcess(app.id, false)}
                                            disabled={processing === app.id}
                                        >
                                            {processing === app.id ? '⏳' : '❌ Отклонить'}
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