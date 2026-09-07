// projecthub.client/src/components/ProjectDetailsPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchProjectByCode, toggleFavoriteByCode } from '../services/projectsApi';
import { createApplicationByCode, getProjectApplications, processApplication } from '../services/applicationsApi';
import { getCategoryName, getStatusName, getVisibilityName } from '../utils/constants';
import MemberCard from './MemberCard';
import '../styles/components/ProjectDetailsPage.css';

const ProjectDetailsPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applications, setApplications] = useState([]);
    const [showApplications, setShowApplications] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [notification, setNotification] = useState(null);
    const [userStatus, setUserStatus] = useState('NotJoined');
    const [justSubmitted, setJustSubmitted] = useState(false);

    // 📌 Состояния для избранного
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указана';
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
            return 'Не указана';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return '#27ae60';
            case 'Uncompleted': return '#e67e22';
            default: return '#666';
        }
    };

    const loadProjectDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNotification(null);

        try {
            const projectData = await searchProjectByCode(code);
            console.log('🔍 ВЕСЬ ОТВЕТ СЕРВЕРА:', JSON.stringify(projectData, null, 2));

            if (projectData) {
                setProject(projectData);
                setMembers(projectData.members || []);
                setUserStatus(projectData.userStatus || 'NotJoined');
                setIsFavorite(projectData.isFavorite || false);
                setFavoritesCount(projectData.favoritesCount || 0);
                setJustSubmitted(false);
            } else {
                setError('Проект не найден');
            }
        } catch (err) {
            console.error('Ошибка загрузки проекта:', err);
            setError(err.message || 'Не удалось загрузить проект');
        } finally {
            setLoading(false);
        }
    }, [code]);

    useEffect(() => {
        loadProjectDetails();
    }, [loadProjectDetails]);

    // 📌 Обработчик клика по звездочке
    const handleFavoriteClick = async () => {
        if (isTogglingFavorite || !project?.publicCode) return;

        setIsTogglingFavorite(true);
        try {
            const result = await toggleFavoriteByCode(project.publicCode);
            setIsFavorite(result);
            setFavoritesCount(prev => result ? prev + 1 : prev - 1);
        } catch (error) {
            console.error('❌ Ошибка при изменении избранного:', error);
            setNotification({ type: 'error', text: 'Не удалось изменить избранное' });
        } finally {
            setIsTogglingFavorite(false);
        }
    };
    // 📌 Загрузить заявки (только для владельца/админа)
    const loadApplications = async () => {
        if (!project?.id) return;

        try {
            const data = await getProjectApplications(project.id);
            setApplications(data);
            setShowApplications(true);
        } catch (err) {
            setNotification({ type: 'error', text: err.message });
        }
    };

    const handleSubmitApplication = async () => {
        if (!project?.publicCode) return;

        setIsSubmitting(true);
        setNotification(null);

        try {
            await createApplicationByCode(project.publicCode, message);

            setNotification({
                type: 'success',
                text: '✅ Заявка отправлена! Ожидайте подтверждения от владельца проекта.'
            });
            setMessage('');
            setUserStatus('Pending');
            setJustSubmitted(true);
            await loadProjectDetails();
        } catch (err) {
            setNotification({ type: 'error', text: err.message });
            setUserStatus('NotJoined');
            setJustSubmitted(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 📌 Обработать заявку (владелец/админ)
    const handleProcessApplication = async (applicationId, approve) => {
        try {
            await processApplication(applicationId, approve);
            await loadApplications();
            await loadProjectDetails();
            setNotification({
                type: 'success',
                text: approve ? '✅ Заявка одобрена!' : '❌ Заявка отклонена'
            });
        } catch (err) {
            setNotification({ type: 'error', text: err.message });
        }
    };

    if (loading) {
        return (
            <div className="project-details-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка проекта...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="project-details-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="project-details-not-found">
                <div className="not-found-icon">📭</div>
                <h3>Проект не найден</h3>
                <p>Возможно, проект был удален или у вас нет доступа</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    const canSubmitApplication =
        userStatus === 'NotJoined' &&
        !justSubmitted &&
        !isSubmitting;

    // 📌 Определяем, что показывать в секции присоединения
    const renderJoinSection = () => {
        console.log('🔍 renderJoinSection, userStatus:', userStatus, 'justSubmitted:', justSubmitted);

        switch (userStatus) {
            case 'Owner':
                return (
                    <div className="already-member owner">
                        👑 Вы являетесь владельцем этого проекта
                    </div>
                );
            case 'Admin':
                return (
                    <div className="already-member admin">
                        ⚡ Вы являетесь администратором этого проекта
                    </div>
                );
            case 'Member':
                return (
                    <div className="already-member">
                        ✅ Вы уже являетесь участником этого проекта
                    </div>
                );
            case 'Pending':
                return (
                    <div className="pending-application success">
                        ✅ Заявка успешно отправлена! Ожидайте ответа от владельца проекта.
                    </div>
                );
            case 'NotJoined':
            default:
                if (justSubmitted) {
                    return (
                        <div className="pending-application success">
                            ✅ Заявка успешно отправлена! Ожидайте ответа от владельца проекта.
                        </div>
                    );
                }
                return (
                    <div className="join-form-wrapper">
                        <h3>🤝 Присоединиться к проекту</h3>
                        <div className="join-form">
                            <textarea
                                placeholder="Напишите сообщение владельцу проекта (необязательно)"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows="3"
                                disabled={!canSubmitApplication || isSubmitting}
                            />
                            <button
                                className="btn-join"
                                onClick={handleSubmitApplication}
                                disabled={!canSubmitApplication || isSubmitting}
                            >
                                {isSubmitting ? '⏳ Отправка...' : '📩 Отправить заявку'}
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="project-details-page">
            <header className="details-header">
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Назад
                </button>
                <h1>{project.name}</h1>
                <div className="header-badges">
                    <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(project.status) }}
                    >
                        {getStatusName(project.status)}
                    </span>
                    <span className={`visibility-badge ${project.visibility === 'Private' ? 'private' : 'public'}`}>
                        {getVisibilityName(project.visibility)}
                    </span>
                    {/* 📌 ЗВЕЗДОЧКА В ШАПКЕ */}
                    <button
                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                        onClick={handleFavoriteClick}
                        disabled={isTogglingFavorite}
                        title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                    >
                        {isFavorite ? '⭐' : '☆'}
                        {favoritesCount > 0 && (
                            <span className="favorites-count">{favoritesCount}</span>
                        )}
                    </button>
                </div>
            </header>

            <div className="details-content">
                {/* Информация о проекте */}
                <section className="info-section">
                    <h2>📋 Информация о проекте</h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">📂 Категория</span>
                            <span className="info-value">{getCategoryName(project.category)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">🔑 Код проекта</span>
                            <span className="info-value code-value">{project.publicCode}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">📅 Дедлайн</span>
                            <span className="info-value">{formatDate(project.deadline)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">📅 Создан</span>
                            <span className="info-value">{formatDate(project.createdAt)}</span>
                        </div>
                    </div>

                    {project.description && (
                        <div className="description-section">
                            <h3>📝 Описание</h3>
                            <p>{project.description}</p>
                        </div>
                    )}
                </section>

                {/* Участники */}
                <section className="members-section">
                    <div className="members-header">
                        <h2>👥 Участники</h2>
                        <span className="members-count">{members.length} чел.</span>
                    </div>

                    {members.length === 0 ? (
                        <div className="no-members">
                            <p>Пока нет участников</p>
                        </div>
                    ) : (
                        <div className="members-grid">
                            {members.map((member) => (
                                <MemberCard key={member.userId} member={member} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Уведомления */}
                {notification && (
                    <div className={`notification ${notification.type}`}>
                        {notification.text}
                    </div>
                )}

                {/* Секция заявок (только для владельца/админа) */}
                {(userStatus === 'Owner' || userStatus === 'Admin') && (
                    <section className="applications-section">
                        <div className="applications-header">
                            <h2>📨 Заявки на вступление</h2>
                            <button
                                className="btn-toggle-applications"
                                onClick={() => {
                                    if (!showApplications) {
                                        loadApplications();
                                    } else {
                                        setShowApplications(false);
                                    }
                                }}
                            >
                                {showApplications ? 'Скрыть' : 'Показать'} заявки ({applications.filter(a => a.status === 'Pending').length})
                            </button>
                        </div>

                        {showApplications && (
                            <div className="applications-list">
                                {applications.filter(a => a.status === 'Pending').length === 0 ? (
                                    <p className="no-applications">Нет ожидающих заявок</p>
                                ) : (
                                    applications.filter(a => a.status === 'Pending').map(app => (
                                        <div key={app.id} className="application-item">
                                            <div className="application-user">
                                                <span className="app-user-name">{app.userName}</span>
                                                <span className="app-user-email">{app.userEmail}</span>
                                                {app.message && (
                                                    <span className="app-message">💬 {app.message}</span>
                                                )}
                                            </div>
                                            <div className="application-actions">
                                                <button
                                                    className="btn-approve"
                                                    onClick={() => handleProcessApplication(app.id, true)}
                                                >
                                                    ✅ Принять
                                                </button>
                                                <button
                                                    className="btn-reject"
                                                    onClick={() => handleProcessApplication(app.id, false)}
                                                >
                                                    ❌ Отклонить
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* 📌 Секция присоединения */}
                <section className="join-section">
                    {renderJoinSection()}
                </section>

                {/* Действия */}
                <div className="actions-section">
                    <button className="btn-edit">✏️ Редактировать</button>
                    <button className="btn-share">📤 Поделиться</button>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;