// projecthub.client/src/components/ProjectDashboardPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchMyProjectByCode } from '../services/projectsApi';
import {
    getCategoryName,
    getStatusName,
    getVisibilityName,
    TASK_PRIORITIES,
} from '../utils/constants';
import { getProjectChatByCode } from '../services/chatsApi';
import { getVotingsSummary } from '../services/votingsApi';
import { getTasksBoard, getProjectTags } from '../services/tasksApi';
import TasksBoard from './tasks/TasksBoard';
import TaskTimeline from './tasks/TaskTimeline';
import NotificationsDropdown from './NotificationsDropdown';

import MemberCard from './MemberCard';
import RoleManagementModal from './RoleManagementModal';
import EditProjectModal from './EditProjectModal';
import InviteUserModal from './InviteUserModal';
import VotingsListPage from './VotingsListPage';
import ProjectHistoryPage from './ProjectHistoryPage';
import ChatPage from './ChatPage';
import VotingPage from './VotingPage';
import CreateVotingModal from './CreateVotingPage';

import '../styles/components/ProjectDashboardPage.css';

// ── Пункты меню ──
const MENU_ITEMS = [
    { key: 'info', icon: '📋', label: 'Информация' },
    { key: 'members', icon: '👥', label: 'Участники' },
    { key: 'tasks', icon: '🗂️', label: 'Задачи' },
    { key: 'timeline', icon: '📅', label: 'Таймлайн' },
    { key: 'chat', icon: '💬', label: 'Чат проекта' },
    { key: 'votings', icon: '🗳️', label: 'Голосования' },
    { key: 'history', icon: '📜', label: 'История изменений' },
];

const ProjectDashboardPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const [project, setProject] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [userStatus, setUserStatus] = useState('NotJoined');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // 📌 Модалка создания голосования
    const [showCreateVotingModal, setShowCreateVotingModal] = useState(false);

    // 📌 Модалка просмотра/голосования
    const [selectedVotingId, setSelectedVotingId] = useState(null);

    // 📌 Ключ для принудительного обновления списка голосований
    const [votingsRefreshKey, setVotingsRefreshKey] = useState(0);

    // 📌 Активный раздел меню — берём из location.state, если передан
    const [activeSection, setActiveSection] = useState(
        location.state?.section || 'tasks'
    );

    // 📌 Если state.section поменялся — переключаем раздел
    useEffect(() => {
        if (location.state?.section) {
            setActiveSection(location.state.section);
        }
    }, [location.state?.section]);

    // 📌 Фильтры задач (живут на уровне страницы, рендерятся в сайдбаре)
    const [taskFilters, setTaskFilters] = useState({
        onlyMyTasks: false,
        priorityFilter: 'All',
        onlyActive: false,
        hideCompleted: false,
        tagFilters: [],
    });
    const [taskTagSearch, setTaskTagSearch] = useState('');
    const [taskShowTagDropdown, setTaskShowTagDropdown] = useState(false);
    const [taskAllTags, setTaskAllTags] = useState([]);

    // 📌 Бейдж голосований
    const [votingsBadge, setVotingsBadge] = useState(0);

    // 📌 Данные для таймлайна (загружаются отдельно, когда открыт раздел "Таймлайн")
    const [timelineColumns, setTimelineColumns] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineError, setTimelineError] = useState(null);

    // 📌 Встроенный чат проекта
    const [projectChatId, setProjectChatId] = useState(null);
    const [projectChatLoading, setProjectChatLoading] = useState(false);
    const [projectChatError, setProjectChatError] = useState(null);

    // 📌 Меню пользователя
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    const canManageMembers = userStatus === 'Owner' || userStatus === 'Admin';
    const canEdit = userStatus === 'Owner' || userStatus === 'Admin';

    // 📌 Закрытие меню пользователя по клику вне / Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return 'Не указана';
        }
    };

    // 📌 Загрузка данных для таймлайна
    const loadTimeline = useCallback(async () => {
        if (!project?.publicCode) return;
        setTimelineLoading(true);
        setTimelineError(null);
        try {
            const board = await getTasksBoard(project.publicCode);
            setTimelineColumns(board || []);
        } catch (err) {
            console.error('❌ Ошибка загрузки таймлайна:', err);
            setTimelineError(err.message || 'Не удалось загрузить таймлайн');
            setTimelineColumns([]);
        } finally {
            setTimelineLoading(false);
        }
    }, [project?.publicCode]);

    // 📌 Когда открыт раздел "timeline" и есть проект — грузим доску
    useEffect(() => {
        if (activeSection === 'timeline' && project?.publicCode) {
            loadTimeline();
        }
    }, [activeSection, project?.publicCode, loadTimeline]);

    // 📌 Загрузка тегов проекта для панели фильтров задач
    const loadTaskTagsForFilters = useCallback(async () => {
        if (!project?.publicCode) return;
        try {
            const tags = await getProjectTags(project.publicCode);
            setTaskAllTags(tags || []);
        } catch (err) {
            console.warn('Не удалось загрузить теги для фильтров:', err);
            setTaskAllTags([]);
        }
    }, [project?.publicCode]);

    // 📌 Когда открыт раздел "tasks" — подгружаем теги для фильтров
    useEffect(() => {
        if (activeSection === 'tasks' && project?.publicCode) {
            loadTaskTagsForFilters();
        }
    }, [activeSection, project?.publicCode, loadTaskTagsForFilters]);

    // 📌 Загрузка chatId проекта для встроенного чата
    const loadProjectChat = useCallback(async () => {
        if (!project?.publicCode) return;
        setProjectChatLoading(true);
        setProjectChatError(null);
        try {
            const chat = await getProjectChatByCode(project.publicCode);
            setProjectChatId(chat.id);
        } catch (err) {
            console.error('❌ Ошибка загрузки чата проекта:', err);
            setProjectChatError(err.message || 'Не удалось загрузить чат');
            setProjectChatId(null);
        } finally {
            setProjectChatLoading(false);
        }
    }, [project?.publicCode]);

    // 📌 Когда открыт раздел "chat" и есть проект — грузим chatId
    useEffect(() => {
        if (activeSection === 'chat' && project?.publicCode) {
            loadProjectChat();
        }
    }, [activeSection, project?.publicCode, loadProjectChat]);

    // 📌 Загрузить счётчик голосований
    const loadVotingsBadge = useCallback(async (projectCode) => {
        if (!projectCode) return;
        try {
            const summary = await getVotingsSummary(projectCode);
            const count = (summary || []).filter(
                v => !v.isClosed && !v.isExpired && !v.hasVoted
            ).length;
            setVotingsBadge(count);
        } catch (err) {
            console.warn('Не удалось загрузить сводку голосований:', err);
            setVotingsBadge(0);
        }
    }, []);

    const handleInviteUser = () => setShowInviteModal(true);

    const handleInvitationSent = () => {
        setNotification({ type: 'success', text: '✅ Приглашение отправлено!' });
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

                // 📌 Подгружаем счётчик голосований
                loadVotingsBadge(projectData.publicCode);
            } else {
                setError('Проект не найден');
            }
        } catch (err) {
            console.error('Ошибка загрузки проекта:', err);
            setError(err.message || 'Не удалось загрузить проект');
        } finally {
            setLoading(false);
        }
    }, [code, loadVotingsBadge]);

    useEffect(() => {
        loadProjectDetails();
    }, [loadProjectDetails]);

    const handleEditClick = () => setShowEditModal(true);
    const handleRoleManagement = () => setShowRoleModal(true);

    const handleProjectUpdated = async () => {
        await loadProjectDetails();
        setNotification({ type: 'success', text: '✅ Проект обновлен!' });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleRoleChanged = async () => {
        await loadProjectDetails();
        setNotification({ type: 'success', text: '✅ Роли обновлены!' });
        setTimeout(() => setNotification(null), 3000);
    };

    // 📌 Голосование создано (из модалки)
    const handleVotingCreated = () => {
        setNotification({ type: 'success', text: '✅ Голосование создано!' });
        setTimeout(() => setNotification(null), 3000);

        setVotingsRefreshKey(k => k + 1);

        if (project?.publicCode) {
            loadVotingsBadge(project.publicCode);
        }
    };

    // 📌 Изменения в голосовании (голос/закрытие/удаление) — обновляем список и бейдж
    const handleVotingChanged = () => {
        setVotingsRefreshKey(k => k + 1);
        if (project?.publicCode) {
            loadVotingsBadge(project.publicCode);
        }
    };

    // 📌 Меню пользователя
    const handleMenuNavigate = (path) => {
        setUserMenuOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        setUserMenuOpen(false);
        logout();
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

    return (
        <div className="project-dashboard">
            <header className="dashboard-header">
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Назад
                </button>
                <h1>{project.name}</h1>

                <div className="header-right">
                    <NotificationsDropdown />

                    {/* 📌 Меню пользователя */}
                    <div className="user-menu-wrapper" ref={userMenuRef}>
                        <button
                            className={`user-menu-trigger ${userMenuOpen ? 'open' : ''}`}
                            onClick={() => setUserMenuOpen(v => !v)}
                            title="Меню пользователя"
                        >
                            <span className="user-menu-avatar">
                                {user?.name ? user.name[0].toUpperCase() : '👤'}
                            </span>
                            <span className="user-menu-caret">▾</span>
                        </button>

                        {userMenuOpen && (
                            <div className="user-menu-dropdown">
                                <div className="user-menu-header">
                                    <div className="user-menu-name">
                                        {user?.name || 'Пользователь'}
                                    </div>
                                    <div className="user-menu-email">
                                        {user?.email || ''}
                                    </div>
                                </div>

                                <div className="user-menu-divider" />

                                <button
                                    className="user-menu-item"
                                    onClick={() => handleMenuNavigate('/profile')}
                                >
                                    <span className="user-menu-icon">👤</span>
                                    Профиль
                                </button>

                                <button
                                    className="user-menu-item"
                                    onClick={() => handleMenuNavigate('/projects')}
                                    title="Друзья — открываются в разделе проектов"
                                >
                                    <span className="user-menu-icon">👥</span>
                                    Друзья
                                </button>

                                <button
                                    className="user-menu-item"
                                    onClick={() => handleMenuNavigate('/settings')}
                                    title="Скоро"
                                >
                                    <span className="user-menu-icon">⚙️</span>
                                    Настройки
                                </button>

                                <div className="user-menu-divider" />

                                <button
                                    className="user-menu-item danger"
                                    onClick={handleLogout}
                                >
                                    <span className="user-menu-icon">🚪</span>
                                    Выйти
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="dashboard-layout">

                {/* ── ЛЕВАЯ колонка: меню + фильтры задач ── */}
                <aside className="dashboard-sidebar">
                    <nav className="sidebar-nav">
                        {MENU_ITEMS.map(item => (
                            <button
                                key={item.key}
                                type="button"
                                className={`sidebar-nav-item ${activeSection === item.key ? 'active' : ''}`}
                                onClick={() => setActiveSection(item.key)}
                            >
                                <span className="sidebar-nav-icon">{item.icon}</span>
                                <span className="sidebar-nav-label">{item.label}</span>
                                {item.key === 'votings' && votingsBadge > 0 && (
                                    <span className="sidebar-nav-badge">{votingsBadge}</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* 📌 Панель фильтров задач (только в разделе "Задачи") */}
                    {activeSection === 'tasks' && (
                        <div className="sidebar-filters">
                            {/* ── Поиск по тегам ── */}
                            {taskAllTags.length > 0 && (
                                <div className="sidebar-filter-block">
                                    <div className="tag-search-wrapper">
                                        <div
                                            className={`tag-search-input-wrap ${taskFilters.tagFilters.length > 0 ? 'active' : ''}`}
                                        >
                                            <span className="tag-search-icon">🔍</span>
                                            <input
                                                type="text"
                                                className="tag-search-input"
                                                placeholder={
                                                    taskFilters.tagFilters.length > 0
                                                        ? `Выбрано тегов: ${taskFilters.tagFilters.length}`
                                                        : 'Поиск по тегам…'
                                                }
                                                value={taskTagSearch}
                                                onChange={e => setTaskTagSearch(e.target.value)}
                                                onFocus={() => setTaskShowTagDropdown(true)}
                                                onBlur={() =>
                                                    setTimeout(() => setTaskShowTagDropdown(false), 150)
                                                }
                                            />
                                            {taskFilters.tagFilters.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="tag-search-clear"
                                                    title="Сбросить теги"
                                                    onClick={() =>
                                                        setTaskFilters(f => ({ ...f, tagFilters: [] }))
                                                    }
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>

                                        {taskShowTagDropdown && (
                                            <div className="tag-search-dropdown">
                                                {taskAllTags.filter(t =>
                                                    t.name.toLowerCase().includes(taskTagSearch.trim().toLowerCase())
                                                ).length === 0 ? (
                                                    <div className="tag-search-empty">
                                                        {taskTagSearch.trim()
                                                            ? `Тег «${taskTagSearch}» не найден`
                                                            : 'Нет тегов'}
                                                    </div>
                                                ) : (
                                                    taskAllTags
                                                        .filter(t =>
                                                            t.name.toLowerCase().includes(taskTagSearch.trim().toLowerCase())
                                                        )
                                                        .map(t => {
                                                            const checked = taskFilters.tagFilters.includes(t.id);
                                                            return (
                                                                <label
                                                                    key={t.id}
                                                                    className={`tag-search-item ${checked ? 'checked' : ''}`}
                                                                    onMouseDown={e => e.preventDefault()}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => {
                                                                            setTaskFilters(f => ({
                                                                                ...f,
                                                                                tagFilters: f.tagFilters.includes(t.id)
                                                                                    ? f.tagFilters.filter(id => id !== t.id)
                                                                                    : [...f.tagFilters, t.id]
                                                                            }));
                                                                        }}
                                                                    />
                                                                    <span
                                                                        className="tag-search-dot"
                                                                        style={{ backgroundColor: t.color || '#9ca3af' }}
                                                                    />
                                                                    <span className="tag-search-name">{t.name}</span>
                                                                    <span className="tag-search-count">{t.tasksCount}</span>
                                                                </label>
                                                            );
                                                        })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Чекбоксы ── */}
                            <div className="sidebar-filter-block">
                                <label className="sidebar-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={taskFilters.onlyMyTasks}
                                        onChange={e =>
                                            setTaskFilters(f => ({ ...f, onlyMyTasks: e.target.checked }))
                                        }
                                    />
                                    <span>Показать мои задачи</span>
                                </label>

                                <label className="sidebar-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={taskFilters.hideCompleted}
                                        onChange={e =>
                                            setTaskFilters(f => ({ ...f, hideCompleted: e.target.checked }))
                                        }
                                    />
                                    <span>Скрыть завершённые</span>
                                </label>

                                <label className="sidebar-filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={taskFilters.onlyActive}
                                        onChange={e =>
                                            setTaskFilters(f => ({ ...f, onlyActive: e.target.checked }))
                                        }
                                    />
                                    <span>Показать только активные</span>
                                </label>
                            </div>

                            {/* ── Приоритеты ── */}
                            <div className="sidebar-filter-block">
                                <div className="sidebar-filter-title">Приоритеты</div>
                                <div className="sidebar-priority-list">
                                    <button
                                        type="button"
                                        className={`sidebar-priority-item ${taskFilters.priorityFilter === 'All' ? 'active' : ''}`}
                                        onClick={() =>
                                            setTaskFilters(f => ({ ...f, priorityFilter: 'All' }))
                                        }
                                    >
                                        Все
                                    </button>
                                    {TASK_PRIORITIES.map(p => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            className={`sidebar-priority-item ${taskFilters.priorityFilter === p.value ? 'active' : ''}`}
                                            onClick={() =>
                                                setTaskFilters(f => ({ ...f, priorityFilter: p.value }))
                                            }
                                        >
                                            {p.icon} {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── ПРАВАЯ колонка: контент ── */}
                <main className="dashboard-main">
                    {notification && (
                        <div className={`notification ${notification.type}`}>
                            {notification.text}
                        </div>
                    )}

                    {/* ── ИНФОРМАЦИЯ ── */}
                    {activeSection === 'info' && (
                        <section className="dashboard-section">
                            <div className="section-header">
                                <h2>📋 Информация о проекте</h2>
                                {canEdit && (
                                    <button className="btn-edit" onClick={handleEditClick}>
                                        ✏️ Редактировать
                                    </button>
                                )}
                            </div>

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
                                <div className="info-item">
                                    <span className="info-label">📊 Статус</span>
                                    <span className="info-value">{getStatusName(project.status)}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">🔒 Видимость</span>
                                    <span className="info-value">{getVisibilityName(project.visibility)}</span>
                                </div>
                            </div>

                            {project.description && (
                                <div className="description-section">
                                    <h3>📝 Описание</h3>
                                    <p>{project.description}</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── УЧАСТНИКИ ── */}
                    {activeSection === 'members' && (
                        <section className="dashboard-section">
                            <div className="section-header">
                                <h2>👥 Участники</h2>
                                <div className="section-header-actions">
                                    <span className="members-count">{members.length} чел.</span>
                                    {canManageMembers && (
                                        <>
                                            <button
                                                className="btn-manage-roles"
                                                onClick={handleRoleManagement}
                                            >
                                                ⚙️ Управление
                                            </button>
                                            <button
                                                className="btn-invite"
                                                onClick={handleInviteUser}
                                            >
                                                📩 Пригласить
                                            </button>
                                        </>
                                    )}
                                </div>
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
                    )}

                    {/* ── ЗАДАЧИ ── */}
                    {activeSection === 'tasks' && (
                        <section className="dashboard-section">
                            <TasksBoard
                                projectCode={project.publicCode}
                                projectDeadline={project.deadline}
                                currentUserEmail={user.email}
                                isOwner={userStatus === 'Owner'}
                                filters={taskFilters}
                            />
                        </section>
                    )}

                    {/* ── ТАЙМЛАЙН ── */}
                    {activeSection === 'timeline' && (
                        <section className="dashboard-section">
                            <div className="section-header">
                                <h2>📅 Таймлайн задач</h2>
                            </div>

                            {timelineError && (
                                <div className="timeline-error">
                                    ❌ {timelineError}
                                </div>
                            )}

                            {timelineLoading ? (
                                <div className="timeline-loading">⏳ Загрузка таймлайна…</div>
                            ) : timelineColumns.length === 0 ? (
                                <div className="timeline-empty-state">
                                    Нет задач для отображения на таймлайне.
                                </div>
                            ) : (
                                <TaskTimeline columns={timelineColumns} />
                            )}
                        </section>
                    )}

                    {/* ── ЧАТ ПРОЕКТА ── */}
                    {activeSection === 'chat' && (
                        <section className="dashboard-section dashboard-section--chat">
                            {projectChatError && (
                                <div className="timeline-error">
                                    ❌ {projectChatError}
                                </div>
                            )}

                            {projectChatLoading ? (
                                <div className="timeline-loading">⏳ Загрузка чата…</div>
                            ) : !projectChatId ? (
                                <div className="timeline-empty-state">
                                    Чат пока недоступен.
                                </div>
                            ) : (
                                <ChatPage chatId={projectChatId} embedded />
                            )}
                        </section>
                    )}

                    {/* ── ГОЛОСОВАНИЯ ── */}
                    {activeSection === 'votings' && (
                        <section className="dashboard-section">
                            <div className="section-header">
                                <h2>🗳️ Голосования</h2>
                                <div className="section-header-actions">
                                    {votingsBadge > 0 && (
                                        <span className="section-badge">
                                            {votingsBadge} активных
                                        </span>
                                    )}
                                    <button
                                        className="btn-create-voting"
                                        onClick={() => setShowCreateVotingModal(true)}
                                    >
                                        ➕ Создать голосование
                                    </button>
                                </div>
                            </div>

                            {/* Встроенный список голосований */}
                            <VotingsListPage
                                embedded
                                refreshKey={votingsRefreshKey}
                                onOpenVoting={setSelectedVotingId}
                                onCreateVoting={() => setShowCreateVotingModal(true)}
                            />
                        </section>
                    )}

                    {/* ── ИСТОРИЯ ── */}
                    {activeSection === 'history' && (
                        <section className="dashboard-section">
                            <div className="section-header">
                                <h2>📜 История изменений</h2>
                            </div>

                            {/* Встроенная история проекта */}
                            <ProjectHistoryPage embedded />
                        </section>
                    )}
                </main>
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

            {showCreateVotingModal && (
                <CreateVotingModal
                    projectCode={project.publicCode}
                    onClose={() => setShowCreateVotingModal(false)}
                    onCreated={handleVotingCreated}
                />
            )}

            {selectedVotingId && (
                <VotingPage
                    votingId={selectedVotingId}
                    projectUserStatus={userStatus}
                    onClose={() => setSelectedVotingId(null)}
                    onChanged={handleVotingChanged}
                />
            )}
        </div>
    );
};

export default ProjectDashboardPage;