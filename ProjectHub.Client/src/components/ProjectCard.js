// projecthub.client/src/components/ProjectCard.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryName, getStatusName, getVisibilityName } from '../utils/constants';
import { toggleFavoriteByCode } from '../services/projectsApi';
import '../styles/components/ProjectCard.css';
import ProjectCover from './ProjectCover';

const ProjectCard = ({ project, onCopyCode, onFavoriteToggle }) => {
    const navigate = useNavigate();
    const [isFavorite, setIsFavorite] = useState(project.isFavorite || false);
    const [favoritesCount, setFavoritesCount] = useState(project.favoritesCount || 0);
    const [isToggling, setIsToggling] = useState(false);

    // 📌 Синхронизация с пропом — если родитель перезагрузил проекты
    useEffect(() => {
        setIsFavorite(project.isFavorite || false);
    }, [project.isFavorite]);

    useEffect(() => {
        setFavoritesCount(project.favoritesCount || 0);
    }, [project.favoritesCount]);

    // 📌 ЗАЩИТА: если project нет
    if (!project || typeof project !== 'object') {
        console.warn('⚠️ ProjectCard: project is invalid', project);
        return null;
    }

    // 📌 ЗАЩИТА: если нет name
    if (!project.name) {
        console.warn('⚠️ ProjectCard: project has no name', project);
        return (
            <li className="project-item project-item-error">
                <div className="project-header">
                    <h3 style={{ color: '#e67e22' }}>⚠️ Проект без названия</h3>
                    <span className="error-badge">Код: {project.publicCode || 'неизвестен'}</span>
                </div>
            </li>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
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

    // 📌 Обработчик клика по звездочке
    const handleFavoriteClick = async (e) => {
        e.stopPropagation();

        if (isToggling) return;
        if (!project.publicCode) {
            console.error('❌ Нет публичного кода проекта');
            return;
        }

        setIsToggling(true);
        try {
            const result = await toggleFavoriteByCode(project.publicCode);
            setIsFavorite(result);
            setFavoritesCount(prev => result ? prev + 1 : prev - 1);

            if (onFavoriteToggle) {
                onFavoriteToggle(project.publicCode, result);
            }
        } catch (error) {
            console.error('❌ Ошибка при изменении избранного:', error);
        } finally {
            setIsToggling(false);
        }
    };

    // 📌 Клик по карточке
    const handleCardClick = () => {
        if (!project.publicCode) return;

        const userStatus = project.userStatus || 'NotJoined';
        const isMember =
            userStatus === 'Owner' ||
            userStatus === 'Admin' ||
            userStatus === 'Member';

        // 📦 Архивный проект:
        //   • участники (Owner/Admin/Member) → открываем дашборд,
        //     чтобы можно было посмотреть и восстановить из архива;
        //   • остальные → никуда не идём (публичная страница архивного проекта недоступна).
        if (project.isArchived) {
            if (isMember) {
                navigate(`/projects/${project.publicCode}/dashboard`);
            }
            return;
        }

        if (isMember) {
            navigate(`/projects/${project.publicCode}/dashboard`);
        } else {
            navigate(`/projects/${project.publicCode}`);
        }
    };

    const handleCopyClick = (e) => {
        e.stopPropagation();
        if (onCopyCode && project.publicCode) {
            onCopyCode(project.publicCode);
        }
    };

    const name = project.name || 'Без названия';
    const description = project.description || '';
    const category = project.category || 'Other';
    const visibility = project.visibility || 'Private';
    const status = project.status || 'Active';
    const publicCode = project.publicCode || '---';
    const deadline = project.deadline || null;
    const createdAt = project.createdAt || null;
    const isArchived = !!project.isArchived;
    const tags = Array.isArray(project.tags) ? project.tags : [];

    return (
        <li
            className={`project-item ${isArchived ? 'project-item--archived' : ''}`}
            onClick={handleCardClick}
        >
            {/* 🆕 Обложка */}
            <ProjectCover
                coverImageUrl={project.coverImageUrl}
                name={name}
                publicCode={publicCode}
                size="lg"
            />

            {/* ── Контент карточки ── */}
            <div className="project-card-body">
                <div className="project-header">
                    <h3>{name}</h3>
                    <div className="project-header-right">
                        <div className="project-badges">
                            <span
                                className="status-tag"
                                style={{ backgroundColor: getStatusColor(status) }}
                            >
                                {getStatusName(status)}
                            </span>
                            <span className={`visibility-tag ${visibility === 'Private' ? 'private' : 'public'}`}>
                                {getVisibilityName(visibility)}
                            </span>
                            {isArchived && (
                                <span className="archive-tag">📦 В архиве</span>
                            )}
                        </div>
                        <button
                            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                            onClick={handleFavoriteClick}
                            disabled={isToggling}
                            title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                        >
                            {isFavorite ? '⭐' : '☆'}
                            {favoritesCount > 0 && (
                                <span className="favorites-count">{favoritesCount}</span>
                            )}
                        </button>
                    </div>
                </div>

                {description && (
                    <p className="project-description">{description}</p>
                )}

                <div className="project-meta">
                    <span className="meta-item">
                        <strong>Категория:</strong> {getCategoryName(category)}
                    </span>
                    {deadline && (
                        <span className="meta-item">
                            <strong>Дедлайн:</strong> {formatDate(deadline)}
                        </span>
                    )}
                    <span className="meta-item code-meta">
                        <strong>Код:</strong>
                        <span className="project-code-display">{publicCode}</span>
                        <button
                            className="copy-code-btn"
                            onClick={handleCopyClick}
                            title="Скопировать код"
                        >
                            📋
                        </button>
                    </span>
                </div>

                {tags.length > 0 && (
                    <div className="project-card-tags">
                        {tags.slice(0, 6).map(t => (
                            <span
                                key={t.id}
                                className="project-card-tag"
                                style={{
                                    backgroundColor: t.color ? `${t.color}22` : '#eef2ff',
                                    color: t.color || '#4f46e5',
                                    borderColor: t.color || '#c7d2fe'
                                }}
                                title={t.name}
                            >
                                {t.name}
                            </span>
                        ))}
                        {tags.length > 6 && (
                            <span
                                className="project-card-tag-more"
                                title={tags.slice(6).map(t => t.name).join(', ')}
                            >
                                +{tags.length - 6}
                            </span>
                        )}
                    </div>
                )}

                {createdAt && (
                    <div className="project-footer">
                        <span className="created-at">
                            📅 Создан: {formatDate(createdAt)}
                        </span>
                    </div>
                )}
            </div>
        </li>
    );
};

export default ProjectCard;