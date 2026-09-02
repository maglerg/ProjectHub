// projecthub.client/src/components/ProjectCard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryName, getStatusName, getVisibilityName } from '../utils/constants';
import '../styles/components/ProjectCard.css';

const ProjectCard = ({ project, onCopyCode }) => {
    const navigate = useNavigate();
    // 📌 ЗАЩИТА: если project нет — ничего не рендерим
    if (!project || typeof project !== 'object') {
        console.warn('⚠️ ProjectCard: project is invalid', project);
        return null;
    }

    // 📌 ЗАЩИТА: если нет name — показываем заглушку
    if (!project.name) {
        console.warn('⚠️ ProjectCard: project has no name', project);
        return (
            <li className="project-item project-item-error">
                <div className="project-header">
                    <h3 style={{ color: '#e67e22' }}>⚠️ Проект без названия</h3>
                    <span className="error-badge">ID: {project.id || 'неизвестен'}</span>
                </div>
            </li>
        );
    }

    // Форматируем дату
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

    // Определяем цвет статуса
    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return '#27ae60';    // Зеленый
            case 'Uncompleted': return '#e67e22';  // Оранжевый
            default: return '#666';
        }
    };

    const getStatusName = (status) => {
        switch (status) {
            case 'Completed': return '✅ Завершен';
            case 'Uncompleted': return '⏳ В процессе';
            default: return status || 'Неизвестно';
        }
    };
    // 📌 ОБРАБОТЧИК КЛИКА ПО КАРТОЧКЕ
    const handleCardClick = () => {
        if (project.publicCode) {
            navigate(`/projects/${project.publicCode}`);
        }
    };

    // ОБРАБОТЧИК КОПИРОВАНИЯ (останавливает всплытие)
    const handleCopyClick = (e) => {
        e.stopPropagation(); // Не даем сработать клику по карточке
        if (onCopyCode && project.publicCode) {
            onCopyCode(project.publicCode);
        }
    };

    // 📌 Безопасное получение значений (с дефолтными значениями)
    const name = project.name || 'Без названия';
    const description = project.description || '';
    const category = project.category || 'Other';
    const visibility = project.visibility || 'Private';
    const status = project.status || 'Active';
    const publicCode = project.publicCode || '---';
    const deadline = project.deadline || null;
    const createdAt = project.createdAt || null;

    return (
        <li className="project-item" onClick={handleCardClick}>
            <div className="project-header">
                <h3>{name}</h3>
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

            {createdAt && (
                <div className="project-footer">
                    <span className="created-at">
                        📅 Создан: {formatDate(createdAt)}
                    </span>
                </div>
            )}
        </li>
    );
};

export default ProjectCard;