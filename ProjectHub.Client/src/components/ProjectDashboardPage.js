// projecthub.client/src/components/ProjectDashboardPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchMyProjectByCode, toggleFavoriteByCode } from '../services/projectsApi';
import { getCategoryName, getStatusName, getVisibilityName } from '../utils/constants';
import MemberCard from './MemberCard';
import RoleManagementModal from './RoleManagementModal';
import EditProjectModal from './EditProjectModal';
import InviteUserModal from './InviteUserModal';
import '../styles/components/ProjectDashboardPage.css';

const ProjectDashboardPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [userStatus, setUserStatus] = useState('NotJoined');
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);  // ← ДОБАВИТЬ!

    const canManageMembers = userStatus === 'Owner' || userStatus === 'Admin';

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

    // 📌 Обработчик открытия модалки приглашения
    const handleInviteUser = () => {
        setShowInviteModal(true);
    };

    const handleInvitationSent = () => {
        setNotification({
            type: 'success',
            text: '✅ Приглашение отправлено!'
        });
        setTimeout(() => setNotification(null), 3000);
    };

    const loadProjectDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNotification(null);

        try {
            const projectData = await searchMyProjectByCode(code);

            if (projectData) {
                const status = projectData.userStatus || 'NotJoined';
                const isMember = status === 'Owner' || status === 'Admin' || status === 'Member';

                if (!isMember) {
                    setError('У вас нет доступа к этой странице');
                    setLoading(false);
                    return;
                }

                setProject(projectData);
                setMembers(projectData.members || []);
                setUserStatus(status);
                setIsFavorite(projectData.isFavorite || false);
                setFavoritesCount(projectData.favoritesCount || 0);
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

    const handleEditClick = () => {
        setShowEditModal(true);
    };

    const handleRoleManagement = () => {
        setShowRoleModal(true);
    };

    const handleProjectUpdated = async () => {
        await loadProjectDetails();
        setNotification({
            type: 'success',
            text: '✅ Проект обновлен!'
        });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleRoleChanged = async () => {
        await loadProjectDetails();
        setNotification({
            type: 'success',
            text: '✅ Роли обновлены!'
        });
        setTimeout(() => setNotification(null), 3000);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка проекта...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка доступа</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="dashboard-not-found">
                <div className="not-found-icon">📭</div>
                <h3>Проект не найден</h3>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    const canEdit = userStatus === 'Owner' || userStatus === 'Admin';
    const isOwner = userStatus === 'Owner';

    return (
        <div className="project-dashboard">
            <header className="dashboard-header">
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

            <div className="dashboard-content">
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
                        <div className="info-item">
                            <span className="info-label">👤 Ваша роль</span>
                            <span className="info-value role-badge">{userStatus}</span>
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
                        {canManageMembers && (
                            <button
                                className="btn-manage-roles"
                                onClick={handleRoleManagement}
                            >
                                ⚙️ Управление участниками
                            </button>
                        )}
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

                <section className="actions-section">
                    {canEdit && (
                        <button className="btn-edit" onClick={handleEditClick}>
                            ✏️ Редактировать проект
                        </button>
                    )}
                    {canManageMembers && (
                        <button className="btn-invite" onClick={handleInviteUser}>
                            📩 Пригласить участника
                        </button>
                    )}
                </section>
            </div>

            {/* 📌 Модальные окна */}
            {showEditModal && (
                <EditProjectModal
                    project={project}
                    onClose={() => setShowEditModal(false)}
                    onUpdated={handleProjectUpdated}
                    userRole={userStatus}
                />
            )}

            {showRoleModal && (
                <RoleManagementModal
                    project={project}
                    members={members}
                    userRole={userStatus}
                    onClose={() => setShowRoleModal(false)}
                    onRoleChanged={handleRoleChanged}
                    onMemberRemoved={handleProjectUpdated}
                />
            )}

            {showInviteModal && (
                <InviteUserModal
                    project={project}
                    onClose={() => setShowInviteModal(false)}
                    onInvitationSent={handleInvitationSent}
                />
            )}
        </div>
    );
};

export default ProjectDashboardPage;