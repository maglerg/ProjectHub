// projecthub.client/src/components/ProjectDetailsPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { searchProjectByCode } from '../services/projectsApi';
import { getCategoryName, getStatusName, getVisibilityName } from '../utils/constants';
import MemberCard from './MemberCard';
import '../styles/components/ProjectDetailsPage.css';

const ProjectDetailsPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadProjectDetails = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const projectData = await searchProjectByCode(code);

            if (projectData) {
                setProject(projectData);
                setMembers(projectData.members || []);
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
                            <span className="no-members-hint">Пригласите коллег в проект</span>
                        </div>
                    ) : (
                        <div className="members-grid">
                            {members.map((member) => (
                                <MemberCard key={member.id} member={member} />
                            ))}
                        </div>
                    )}
                </section>

                <div className="actions-section">
                    <button className="btn-edit">✏️ Редактировать</button>
                    <button className="btn-share">📤 Поделиться</button>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsPage;