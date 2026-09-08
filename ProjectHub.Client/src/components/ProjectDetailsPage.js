// projecthub.client/src/components/ProjectDetailsPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchProjectByCode, toggleFavoriteByCode } from '../services/projectsApi';
import { createApplicationByCode } from '../services/applicationsApi';
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [notification, setNotification] = useState(null);
    const [userStatus, setUserStatus] = useState('NotJoined');
    const [justSubmitted, setJustSubmitted] = useState(false);
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
                </div>
            </header>

            <div className="details-content">
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

                {notification && (
                    <div className={`notification ${notification.type}`}>
                        {notification.text}
                    </div>
                )}

                {/* 📌 Секция присоединения (только для не-участников) */}
                {userStatus !== 'Owner' && userStatus !== 'Admin' && userStatus !== 'Member' && (
                    <section className="join-section">
                        {userStatus === 'Pending' ? (
                            <div className="pending-application success">
                                ✅ Заявка успешно отправлена! Ожидайте ответа от владельца проекта.
                            </div>
                        ) : (
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
                        )}
                    </section>
                )}

                {/* 📌 Для участников — просто сообщение */}
                {(userStatus === 'Owner' || userStatus === 'Admin' || userStatus === 'Member') && (
                    <section className="join-section">
                        <div className="member-actions">
                            <p>✅ Вы являетесь участником этого проекта</p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailsPage;