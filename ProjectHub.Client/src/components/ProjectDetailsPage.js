// projecthub.client/src/components/ProjectDetailsPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Archive,
    Loader2,
    X,
    Inbox,
    Star,
    ClipboardList,
    Folder,
    KeyRound,
    Calendar,
    FileText,
    Tag as TagIcon,
    Users,
    Check,
    Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { searchProjectByCode, toggleFavoriteByCode } from '../services/projectsApi';
import { createApplicationByCode } from '../services/applicationsApi';
import {
    getProjectTags as getProjectTagsApi
} from '../services/projectTagsApi';
import { getCategoryName, getStatusName, getVisibilityName } from '../utils/constants';
import MemberCard from './MemberCard';
import ProjectCover from './ProjectCover';
import '../styles/components/ProjectDetailsPage.css';

const ProjectDetailsPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [projectTags, setProjectTags] = useState([]);
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

    // ── Загрузка тегов проекта (для публичного просмотра) ──
    const loadProjectTagsForPublic = async (publicCode) => {
        // Теги приходят в ProjectResponse.tags, но на всякий случай
        // попробуем отдельный эндпоинт. Если он вернёт 403 — просто
        // откажемся и оставим теги из project.tags.
        try {
            const tags = await getProjectTagsApi(publicCode);
            setProjectTags(tags || []);
        } catch (err) {
            // На публичной странице эндпоинт может требовать членства —
            // используем теги, пришедшие в самом проекте.
            console.warn('Не удалось загрузить теги отдельно, использую project.tags:', err);
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

                // 🆕 Теги проекта
                if (Array.isArray(projectData.tags)) {
                    setProjectTags(projectData.tags);
                } else {
                    // fallback — попробуем отдельным запросом
                    loadProjectTagsForPublic(projectData.publicCode);
                }
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

        // 📦 В архиве — заявки не принимаются
        if (project.isArchived) {
            setNotification({
                type: 'error',
                text: 'Проект находится в архиве — заявки не принимаются'
            });
            return;
        }

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
                <div className="spinner">
                    <Loader2 size={32} className="icon-spin" />
                </div>
                <p>Загрузка проекта...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="project-details-error">
                <div className="error-icon">
                    <X size={32} />
                </div>
                <h3>Ошибка загрузки</h3>
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
            <div className="project-details-not-found">
                <div className="not-found-icon">
                    <Inbox size={32} />
                </div>
                <h3>Проект не найден</h3>
                <p>Возможно, проект был удален или у вас нет доступа</p>
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

    // 📦 Архив
    const isArchived = !!project.isArchived;

    const canSubmitApplication =
        !isArchived &&
        userStatus === 'NotJoined' &&
        !justSubmitted &&
        !isSubmitting;

    const isMember =
        userStatus === 'Owner' ||
        userStatus === 'Admin' ||
        userStatus === 'Member';

    // ── Используемые теги: сначала projectTags, потом project.tags ──
    const tagsToRender = projectTags.length > 0
        ? projectTags
        : (Array.isArray(project.tags) ? project.tags : []);

    return (
        <div className="project-details-page">
            <header className="details-header">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>
                <h1>
                    {project.name}
                    {isArchived && (
                        <span className="archive-badge">
                            <Archive size={12} />
                            В архиве
                        </span>
                    )}
                </h1>
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

                    {/* 🆕 Избранное */}
                    <button
                        type="button"
                        className={`btn btn--ghost btn--icon project-favorite-btn-lg ${isFavorite ? 'active' : ''}`}
                        onClick={handleFavoriteClick}
                        disabled={isTogglingFavorite}
                        title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                        aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                    >
                        <Star
                            size={18}
                            fill={isFavorite ? 'currentColor' : 'none'}
                        />
                        {favoritesCount > 0 && (
                            <span className="favorites-count-lg">{favoritesCount}</span>
                        )}
                    </button>
                </div>
            </header>

            {isArchived && (
                <div className="archive-banner">
                    <Archive size={16} />
                    Этот проект в архиве. Присоединение и подача заявок недоступны.
                </div>
            )}

            <div className="details-content">
                {/* 🆕 ── ОБЛОЖКА ПРОЕКТА ── */}
                <div className="details-cover">
                    <ProjectCover
                        coverImageUrl={project.coverImageUrl}
                        name={project.name}
                        publicCode={project.publicCode}
                        size="lg"
                    />
                </div>

                <section className="info-section">
                    <h2>
                        <ClipboardList size={20} />
                        Информация о проекте
                    </h2>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">
                                <Folder size={14} />
                                Категория
                            </span>
                            <span className="info-value">{getCategoryName(project.category)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">
                                <KeyRound size={14} />
                                Код проекта
                            </span>
                            <span className="info-value code-value">{project.publicCode}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">
                                <Calendar size={14} />
                                Дедлайн
                            </span>
                            <span className="info-value">{formatDate(project.deadline)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">
                                <Calendar size={14} />
                                Создан
                            </span>
                            <span className="info-value">{formatDate(project.createdAt)}</span>
                        </div>
                    </div>

                    {project.description && (
                        <div className="description-section">
                            <h3>
                                <FileText size={16} />
                                Описание
                            </h3>
                            <p>{project.description}</p>
                        </div>
                    )}

                    {/* 🆕 ── ТЕГИ ПРОЕКТА ── */}
                    {tagsToRender.length > 0 && (
                        <div className="details-tags-section">
                            <h3>
                                <TagIcon size={16} />
                                Теги проекта
                            </h3>
                            <div className="details-tags-view">
                                {tagsToRender.map(t => (
                                    <span
                                        key={t.id}
                                        className="project-tag-chip"
                                        style={{
                                            backgroundColor: t.color ? `${t.color}22` : '#eef2ff',
                                            color: t.color || '#4f46e5',
                                            borderColor: t.color || '#c7d2fe'
                                        }}
                                    >
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <section className="members-section">
                    <div className="members-header">
                        <h2>
                            <Users size={20} />
                            Участники
                        </h2>
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

                {/* 📌 Секция присоединения — только для не-участников и не в архиве */}
                {!isMember && !isArchived && (
                    <section className="join-section">
                        {userStatus === 'Pending' ? (
                            <div className="pending-application success">
                                <Check size={16} />
                                Заявка успешно отправлена! Ожидайте ответа от владельца проекта.
                            </div>
                        ) : (
                            <div className="join-form-wrapper">
                                <h3>
                                    <Users size={18} />
                                    Присоединиться к проекту
                                </h3>
                                <div className="join-form">
                                    <textarea
                                        placeholder="Напишите сообщение владельцу проекта (необязательно)"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows="3"
                                        disabled={!canSubmitApplication || isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn--primary"
                                        onClick={handleSubmitApplication}
                                        disabled={!canSubmitApplication || isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="icon-spin" />
                                                Отправка...
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={16} />
                                                Отправить заявку
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* 📌 Если не участник, но проект в архиве — сообщение */}
                {!isMember && isArchived && (
                    <section className="join-section">
                        <div className="member-actions">
                            <p>
                                <Archive size={16} />
                                Проект в архиве — присоединиться невозможно
                            </p>
                        </div>
                    </section>
                )}

                {/* 📌 Для участников — сообщение о членстве */}
                {isMember && (
                    <section className="join-section">
                        <div className="member-actions">
                            <p>
                                {isArchived ? (
                                    <>
                                        <Archive size={16} />
                                        Вы участник этого проекта (в архиве)
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Вы являетесь участником этого проекта
                                    </>
                                )}
                            </p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailsPage;