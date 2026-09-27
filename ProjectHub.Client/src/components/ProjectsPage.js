// projecthub.client/src/components/ProjectsPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Folder,
    Plus,
    Search,
    User,
    Users,
    Star,
    Archive,
    MessageCircle,
    FileText,
    Settings,
    LogOut,
    ChevronDown,
    ArrowLeft,
    Rocket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/ProjectsPage.css';

import CreateProjectForm from './CreateProjectForm';
import SearchSection from './SearchSection';
import ProjectList from './ProjectList';
import FilterSection from './FilterSection';
import NotificationsDropdown from './NotificationsDropdown';
import FriendsList from './FriendsList';
import ProjectTagsFilter from './ProjectTagsFilter';
import UserAvatar from './UserAvatar';
import EditProjectModal from './EditProjectModal';
import InviteUserModal from './InviteUserModal';
import ChatsListPage from './ChatsListPage';
import NotesPage from './notes/NotesPage';
import { searchProjectsByTags, setProjectTags } from '../services/projectTagsApi';
import { signalr } from '../services/signalrService';   // 🆕

import {
    fetchAllProjects,
    createProject,
    fetchMyProjects,
    fetchArchivedProjects,
    archiveProject,
    unarchiveProject,
} from '../services/projectsApi';
import { getFriends, removeFriend } from '../services/friendsApi';

// 🆕 Ключ для sessionStorage
const TAB_STORAGE_KEY = 'projects.activeTab';

const ProjectsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [view, setView] = useState('projects');

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState(null);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState([]);

    const [shouldResetForm, setShouldResetForm] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showMyProjectsOnly, setShowMyProjectsOnly] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    const [editingProject, setEditingProject] = useState(null);
    const [invitingProject, setInvitingProject] = useState(null);

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // ── Закрытие меню пользователя ──
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

    // 🆕 Загрузка данных для восстановленного таба
    const loadTabData = (tab) => {
        if (tab === 'my') {
            setShowMyProjectsOnly(true);
            setShowFavoritesOnly(false);
            loadProjects(false, true);
        } else if (tab === 'favorites') {
            setShowFavoritesOnly(true);
            setShowMyProjectsOnly(false);
            loadProjects(true, false);
        } else if (tab === 'archive') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            loadArchivedProjects();
        } else if (tab === 'create') {
            // пустая форма, ничего грузить не нужно
        } else if (tab === 'search' || tab === 'chats' || tab === 'notes') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setProjects([]);
        }
    };

    // 🆕 Восстановление активного таба при монтировании
    useEffect(() => {
        const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);
        if (savedTab) {
            setActiveTab(savedTab);
            loadTabData(savedTab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Загрузка проектов ──
    const loadProjects = async (favoritesOnly = false, myProjectsOnly = false, category = null) => {
        setLoading(true);
        setMessage('');
        try {
            let data;
            if (myProjectsOnly) {
                data = await fetchMyProjects();
            } else {
                data = await fetchAllProjects(favoritesOnly, category);
            }

            if (Array.isArray(data)) {
                setProjects(data);
            } else {
                setProjects([]);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки проектов:', error);
            setMessage(`❌ ${error.message || 'Ошибка загрузки проектов'}`);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const loadArchivedProjects = async () => {
        setLoading(true);
        setMessage('');
        try {
            const data = await fetchArchivedProjects();
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('❌ Ошибка загрузки архивных проектов:', error);
            setMessage(`❌ ${error.message || 'Ошибка загрузки архива'}`);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const searchByTags = async () => {
        if (selectedTagIds.length === 0) {
            setMessage('❌ Выберите хотя бы один тег');
            return;
        }

        setLoading(true);
        setMessage('');
        try {
            const data = await searchProjectsByTags(selectedTagIds);

            if (Array.isArray(data)) {
                setProjects(data);
                setMessage(
                    data.length > 0
                        ? `✅ Найдено проектов: ${data.length}`
                        : '🔍 По выбранным тегам проектов не найдено'
                );
            } else {
                setProjects([]);
            }
        } catch (error) {
            console.error('❌ Ошибка поиска по тегам:', error);
            setMessage(`❌ ${error.message || 'Ошибка поиска по тегам'}`);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const loadFriends = async () => {
        setFriendsLoading(true);
        try {
            const data = await getFriends();
            setFriends(data || []);
        } catch (error) {
            console.error('❌ Ошибка загрузки друзей:', error);
            setMessage('❌ ' + error.message);
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleFriendAdded = (newFriend) => {
        setFriends((prev) => [newFriend, ...prev]);
        setMessage('✅ Друг добавлен!');
        setTimeout(() => setMessage(''), 3000);
    };

    const handleFriendRemoved = async (friendId) => {
        try {
            await removeFriend(friendId);
            setFriends((prev) => prev.filter((f) => f.id !== friendId));
            setMessage('✅ Друг удален');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('❌ ' + error.message);
        }
    };

    const handleFavoriteToggle = (publicCode, isFavorite) => {
        setProjects((prev) =>
            prev.map((p) => {
                if (p.publicCode !== publicCode) return p;

                const prevCount = p.favoritesCount || 0;
                const nextCount = Math.max(0, prevCount + (isFavorite ? 1 : -1));

                return {
                    ...p,
                    isFavorite,
                    favoritesCount: nextCount,
                };
            })
        );
    };

    // ── Контекстное меню ──

    const handleContextEdit = (project) => {
        setEditingProject(project);
    };

    const handleContextInvite = (project) => {
        setInvitingProject(project);
    };

    const handleContextArchive = async (project) => {
        if (!project?.publicCode) return;

        if (!window.confirm(
            `Архивировать проект «${project.name}»?\n\n` +
            'Ожидающие заявки и приглашения будут отменены, ' +
            'активные голосования — закрыты.'
        )) return;

        try {
            await archiveProject(project.publicCode);
            setMessage('📦 Проект архивирован');
            setTimeout(() => setMessage(''), 3000);

            if (activeTab === 'archive') {
                await loadArchivedProjects();
            } else if (activeTab === 'my') {
                await loadProjects(false, true);
            } else {
                await loadProjects(showFavoritesOnly, false, selectedCategory);
            }
        } catch (err) {
            console.error('❌ Ошибка архивации:', err);
            setMessage('❌ ' + err.message);
        }
    };

    const handleContextUnarchive = async (project) => {
        if (!project?.publicCode) return;

        if (!window.confirm(
            `Восстановить проект «${project.name}» из архива?\n\n` +
            'Отменённые заявки и приглашения не восстановятся.'
        )) return;

        try {
            await unarchiveProject(project.publicCode);
            setMessage('↩️ Проект восстановлен');
            setTimeout(() => setMessage(''), 3000);

            if (activeTab === 'archive') {
                await loadArchivedProjects();
            } else {
                await loadProjects(showFavoritesOnly, showMyProjectsOnly, selectedCategory);
            }
        } catch (err) {
            console.error('❌ Ошибка восстановления:', err);
            setMessage('❌ ' + err.message);
        }
    };

    const handleContextDelete = null;

    const projectListProps = {
        projects,
        loading,
        onCopyCode: (code) => {
            navigator.clipboard.writeText(code);
            setMessage('✅ Код скопирован в буфер обмена!');
            setTimeout(() => setMessage(''), 3000);
        },
        onFavoriteToggle: handleFavoriteToggle,
        onEdit: handleContextEdit,
        onInvite: handleContextInvite,
        onArchive: handleContextArchive,
        onUnarchive: handleContextUnarchive,
        onDelete: handleContextDelete,
    };

    const handleCreateProject = async (projectData) => {
        setLoading(true);
        try {
            const newProject = await createProject(projectData);

            if (Array.isArray(projectData.tagIds) && projectData.tagIds.length > 0) {
                try {
                    await setProjectTags(newProject.publicCode, projectData.tagIds);
                } catch (tagErr) {
                    console.error('❌ Ошибка привязки тегов:', tagErr);
                    setMessage(
                        `⚠️ Проект создан, но теги не привязались: ${tagErr.message}`
                    );
                    setTimeout(() => setMessage(''), 5000);
                }
            }

            setMessage(
                `✅ Проект "${newProject.name}" успешно создан! Код: ${newProject.publicCode}`
            );
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            await loadProjects(false, false);
            setShouldResetForm(true);
            setTimeout(() => setShouldResetForm(false), 100);
        } catch (error) {
            setMessage(`❌ Ошибка: ${error.message || 'Проверьте введенные данные'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = (value) => setSelectedCategory(value);

    const handleCategorySearch = () => {
        setSelectedTagIds([]);
        loadProjects(false, false, selectedCategory || null);
    };

    const resetFilters = () => {
        setSelectedCategory('');
        setShowFavoritesOnly(false);
        setShowMyProjectsOnly(false);
        setSelectedTagIds([]);
        setProjects([]);
        setMessage('');
    };

    const pluralProjects = (n) => {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return 'проект';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'проекта';
        return 'проектов';
    };

    // 🆕 Централизованное переключение таба с сохранением в sessionStorage
    const changeTab = (tab) => {
        setActiveTab(tab);
        if (tab) {
            sessionStorage.setItem(TAB_STORAGE_KEY, tab);
        } else {
            sessionStorage.removeItem(TAB_STORAGE_KEY);
        }
    };

    const handleTabClick = (tab) => {
        if (activeTab === tab) {
            changeTab(null);
            setMessage('');
            setProjects([]);
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setSelectedTagIds([]);
            setSelectedCategory('');
            return;
        }

        changeTab(tab);
        setMessage('');

        if (tab === 'create') return;

        if (tab === 'search') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setSelectedCategory('');
            setSelectedTagIds([]);
            setProjects([]);
        } else if (tab === 'my') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(true);
            setSelectedTagIds([]);
            setSelectedCategory('');
            loadProjects(false, true);
        } else if (tab === 'favorites') {
            setShowFavoritesOnly(true);
            setShowMyProjectsOnly(false);
            setSelectedTagIds([]);
            setSelectedCategory('');
            loadProjects(true, false);
        } else if (tab === 'archive') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setSelectedTagIds([]);
            setSelectedCategory('');
            loadArchivedProjects();
        } else if (tab === 'chats') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setSelectedTagIds([]);
            setSelectedCategory('');
            setProjects([]);
        } else if (tab === 'notes') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setSelectedTagIds([]);
            setSelectedCategory('');
            setProjects([]);
        }
    };

    const openFriendsSection = () => {
        setView('friends');
        changeTab(null);
        setMessage('');
        setShowFavoritesOnly(false);
        setShowMyProjectsOnly(false);
        setSelectedTagIds([]);
        setSelectedCategory('');
        loadFriends();
    };

    const backToProjects = () => {
        setView('projects');
        changeTab(null);
        setMessage('');
    };

    const handleMenuNavigate = (path) => {
        setUserMenuOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        setUserMenuOpen(false);
        sessionStorage.removeItem(TAB_STORAGE_KEY);
        logout();
    };

    const handleEditUpdated = async () => {
        setEditingProject(null);
        setMessage('✅ Проект обновлён');
        setTimeout(() => setMessage(''), 2500);

        if (activeTab === 'archive') {
            await loadArchivedProjects();
        } else if (activeTab === 'my') {
            await loadProjects(false, true);
        } else if (activeTab === 'favorites') {
            await loadProjects(true, false);
        } else {
            await loadProjects(false, false, selectedCategory);
        }
    };

    const handleInvitationSent = () => {
        setInvitingProject(null);
        setMessage('✅ Приглашение отправлено');
        setTimeout(() => setMessage(''), 2500);
    };

    // ═══════════════════════════════════════════════════════════
    //  🆕 Refs для SignalR — чтобы обработчики видели актуальные
    //     activeTab и фильтры без пересоздания подписок.
    // ═══════════════════════════════════════════════════════════
    const activeTabRef = useRef(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const filtersRef = useRef({
        showFavoritesOnly,
        showMyProjectsOnly,
        selectedCategory,
    });
    useEffect(() => {
        filtersRef.current = {
            showFavoritesOnly,
            showMyProjectsOnly,
            selectedCategory,
        };
    }, [showFavoritesOnly, showMyProjectsOnly, selectedCategory]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: realtime-архивация проектов
    //     Owner в одной вкладке архивирует — у admin'а в другой
    //     карточка должна переместиться из «Моих» в «Архив».
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        // ── Проект архивирован ──
        const handleProjectArchived = (payload) => {
            if (!payload?.publicCode) return;

            const tab = activeTabRef.current;

            // Если открыт таб «Архив» — перезагружаем его
            if (tab === 'archive') {
                loadArchivedProjects();
                return;
            }

            // Если открыт таб «Мои проекты» — перезагружаем (проект уйдёт)
            if (tab === 'my') {
                loadProjects(false, true);
                return;
            }

            // Если открыт таб «Избранное» — перезагружаем
            if (tab === 'favorites') {
                loadProjects(true, false);
                return;
            }

            // Общий список / поиск — просто убираем из текущего списка
            setProjects((prev) =>
                prev.filter((p) => p.publicCode !== payload.publicCode)
            );

            setMessage(`📦 Проект «${payload.name || ''}» архивирован`);
            setTimeout(() => setMessage(''), 3000);
        };

        // ── Проект восстановлен ──
        const handleProjectUnarchived = (payload) => {
            if (!payload?.publicCode) return;

            const tab = activeTabRef.current;

            // Если открыт таб «Архив» — перезагружаем (проект уйдёт)
            if (tab === 'archive') {
                loadArchivedProjects();
                return;
            }

            // Если открыт таб «Мои проекты» — перезагружаем (проект вернётся)
            if (tab === 'my') {
                loadProjects(false, true);
                return;
            }

            // Если открыт общий список с фильтрами — перезагружаем
            const { selectedCategory: cat } = filtersRef.current;
            if (tab && cat) {
                loadProjects(false, false, cat);
                return;
            }

            setMessage(`↩️ Проект «${payload.name || ''}» восстановлен`);
            setTimeout(() => setMessage(''), 3000);
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing projects list…');
            const tab = activeTabRef.current;

            if (tab === 'archive') {
                loadArchivedProjects();
            } else if (tab === 'my') {
                loadProjects(false, true);
            } else if (tab === 'favorites') {
                loadProjects(true, false);
            } else if (tab) {
                const { selectedCategory: cat } = filtersRef.current;
                loadProjects(false, false, cat || null);
            }
        };

        signalr.on('ProjectArchived', handleProjectArchived);
        signalr.on('ProjectUnarchived', handleProjectUnarchived);
        signalr.on('_reconnected', handleReconnected);

        // Ленивый connect — на случай, если пользователь зашёл сразу на /projects,
        // без открытия чата или дашборда.
        signalr.connect().catch((err) => {
            console.warn('SignalR connect from ProjectsPage failed:', err);
        });

        return () => {
            signalr.off('ProjectArchived', handleProjectArchived);
            signalr.off('ProjectUnarchived', handleProjectUnarchived);
            signalr.off('_reconnected', handleReconnected);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🆕 Первичная загрузка доски — только если в sessionStorage не было сохранённого таба
    useEffect(() => {
        const savedTab = sessionStorage.getItem(TAB_STORAGE_KEY);
        if (!savedTab) {
            loadProjects(false, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="projects-page">
            <header className="page-header">
                <div className="header-left">
                    {/* 🆕 Кнопка Назад — только в режиме друзей */}
                    {view === 'friends' && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={backToProjects}
                            title="Вернуться к проектам"
                            aria-label="Вернуться к проектам"
                        >
                            <ArrowLeft size={16} />
                            Назад
                        </button>
                    )}

                    {/* 🆕 Заголовок меняется в зависимости от view */}
                    <h1>
                        {view === 'friends' ? (
                            <>
                                <Users size={24} />
                                Друзья
                            </>
                        ) : (
                            <>
                                <Folder size={28} />
                                ProjectHub
                            </>
                        )}
                    </h1>
                </div>

                <div className="header-right">
                    <NotificationsDropdown />

                    <div className="user-menu-wrapper" ref={userMenuRef}>
                        <button
                            type="button"
                            className={`user-menu-trigger ${userMenuOpen ? 'open' : ''}`}
                            onClick={() => setUserMenuOpen((v) => !v)}
                            title="Меню пользователя"
                        >
                            <UserAvatar
                                avatarUrl={user?.avatarUrl}
                                name={user?.name}
                                email={user?.email}
                                size="sm"
                            />
                            <span className="user-menu-caret">
                                <ChevronDown size={14} />
                            </span>
                        </button>

                        {userMenuOpen && (
                            <div className="user-menu-dropdown">
                                <div className="user-menu-header">
                                    <UserAvatar
                                        avatarUrl={user?.avatarUrl}
                                        name={user?.name}
                                        email={user?.email}
                                        size="md"
                                    />
                                    <div className="user-menu-header-info">
                                        <div className="user-menu-name">
                                            {user?.name || 'Пользователь'}
                                        </div>
                                        <div className="user-menu-email">
                                            {user?.email || ''}
                                        </div>
                                    </div>
                                </div>

                                <div className="user-menu-divider" />

                                <button
                                    type="button"
                                    className="user-menu-item"
                                    onClick={() => handleMenuNavigate('/profile')}
                                >
                                    <span className="user-menu-icon"><User size={14} /></span>
                                    Профиль
                                </button>

                                <button
                                    type="button"
                                    className="user-menu-item"
                                    onClick={() => {
                                        setUserMenuOpen(false);
                                        openFriendsSection();
                                    }}
                                >
                                    <span className="user-menu-icon"><Users size={14} /></span>
                                    Друзья
                                </button>

                                <button
                                    type="button"
                                    className="user-menu-item"
                                    onClick={() => handleMenuNavigate('/settings')}
                                    title="Скоро"
                                >
                                    <span className="user-menu-icon"><Settings size={14} /></span>
                                    Настройки
                                </button>

                                <div className="user-menu-divider" />

                                <button
                                    type="button"
                                    className="user-menu-item danger"
                                    onClick={handleLogout}
                                >
                                    <span className="user-menu-icon"><LogOut size={14} /></span>
                                    Выйти
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="page-main">
                {/* РЕЖИМ: ДРУЗЬЯ */}
                {view === 'friends' && (
                    <FriendsList
                        friends={friends}
                        loading={friendsLoading}
                        onFriendAdded={handleFriendAdded}
                        onFriendRemoved={handleFriendRemoved}
                    />
                )}

                {/* РЕЖИМ: ПРОЕКТЫ */}
                {view === 'projects' && (
                    <>
                        <div className="tabs-container">
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                                onClick={() => handleTabClick('create')}
                            >
                                <Plus size={16} />
                                Создать проект
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                                onClick={() => handleTabClick('search')}
                            >
                                <Search size={16} />
                                Найти проект
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                                onClick={() => handleTabClick('my')}
                            >
                                <User size={16} />
                                Мои проекты
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                                onClick={() => handleTabClick('favorites')}
                            >
                                <Star size={16} />
                                Избранное
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
                                onClick={() => handleTabClick('archive')}
                            >
                                <Archive size={16} />
                                Архив
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
                                onClick={() => handleTabClick('chats')}
                                title="Чаты"
                            >
                                <MessageCircle size={16} />
                                Чаты
                            </button>
                            <button
                                type="button"
                                className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                                onClick={() => handleTabClick('notes')}
                                title="Мои заметки"
                            >
                                <FileText size={16} />
                                Мои заметки
                            </button>
                        </div>

                        {message && (
                            <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
                                {message}
                            </div>
                        )}

                        <div className="tab-content">
                            {activeTab === 'create' && (
                                <CreateProjectForm
                                    onSubmit={handleCreateProject}
                                    loading={loading}
                                    onCancel={() => changeTab(null)}
                                    resetForm={shouldResetForm}
                                />
                            )}

                            {activeTab === 'search' && (
                                <div className="search-tab">

                                    {/* ═══ Способ 1: поиск по тегам ═══ */}
                                    <section className="search-method">
                                        <header className="search-method-header">
                                            <div className="search-method-title">
                                                <span className="search-method-number">1</span>
                                                <h3>Поиск по тегам</h3>
                                            </div>
                                            <p className="search-method-hint">
                                                Выберите до 5 тегов — найдём проекты, где есть все выбранные
                                            </p>
                                        </header>

                                        <div className="search-method-body">
                                            <ProjectTagsFilter
                                                selectedTagIds={selectedTagIds}
                                                onChange={setSelectedTagIds}
                                                onSearch={searchByTags}
                                                disabled={loading}
                                            />
                                        </div>
                                    </section>

                                    {/* ═══ Способ 2: поиск по коду ═══ */}
                                    <section className="search-method">
                                        <header className="search-method-header">
                                            <div className="search-method-title">
                                                <span className="search-method-number">2</span>
                                                <h3>Поиск по коду</h3>
                                            </div>
                                            <p className="search-method-hint">
                                                Если знаете код проекта — введите его для точного поиска
                                            </p>
                                        </header>

                                        <div className="search-method-body">
                                            <SearchSection />
                                        </div>
                                    </section>

                                    {/* ═══ Способ 3: поиск по категории ═══ */}
                                    <section className="search-method">
                                        <header className="search-method-header">
                                            <div className="search-method-title">
                                                <span className="search-method-number">3</span>
                                                <h3>Поиск по категории</h3>
                                            </div>
                                            <p className="search-method-hint">
                                                Выберите категорию — покажем все проекты в ней
                                            </p>
                                        </header>

                                        <div className="search-method-body">
                                            <FilterSection
                                                selectedCategory={selectedCategory}
                                                onCategoryChange={handleCategoryChange}
                                                onSearch={handleCategorySearch}
                                                onReset={resetFilters}
                                                loading={loading}
                                            />
                                        </div>
                                    </section>

                                    {/* ═══ Результаты ═══ */}
                                    {projects.length > 0 && (
                                        <section className="search-results-block">
                                            <header className="search-results-header">
                                                <h3>Результаты поиска</h3>
                                                <span className="search-results-count">
                                                    {projects.length} {pluralProjects(projects.length)}
                                                </span>
                                            </header>
                                            <ProjectList {...projectListProps} />
                                        </section>
                                    )}
                                </div>
                            )}

                            {activeTab === 'my' && (
                                <div className="list-tab-content">
                                    {projects.length === 0 ? (
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <User size={48} />
                                            </div>
                                            <h3>Нет проектов</h3>
                                            <p>Вы пока не участвуете ни в одном проекте</p>
                                            <button
                                                type="button"
                                                className="btn btn--primary"
                                                onClick={() => handleTabClick('search')}
                                            >
                                                Найти проект
                                            </button>
                                        </div>
                                    ) : (
                                        <ProjectList {...projectListProps} />
                                    )}
                                </div>
                            )}

                            {activeTab === 'favorites' && (
                                <div className="list-tab-content">
                                    {projects.length === 0 ? (
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <Star size={48} />
                                            </div>
                                            <h3>Нет избранных проектов</h3>
                                            <p>Добавляйте проекты в избранное, чтобы быстро находить их здесь</p>
                                            <button
                                                type="button"
                                                className="btn btn--primary"
                                                onClick={() => handleTabClick('my')}
                                            >
                                                Перейти к моим проектам
                                            </button>
                                        </div>
                                    ) : (
                                        <ProjectList {...projectListProps} />
                                    )}
                                </div>
                            )}

                            {activeTab === 'archive' && (
                                <div className="list-tab-content">
                                    {projects.length === 0 ? (
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <Archive size={48} />
                                            </div>
                                            <h3>Архив пуст</h3>
                                            <p>Здесь будут проекты, которые вы архивировали</p>
                                        </div>
                                    ) : (
                                        <ProjectList {...projectListProps} />
                                    )}
                                </div>
                            )}

                            {/* ЧАТЫ — встроенная панель под табами */}
                            {activeTab === 'chats' && (
                                <div className="list-tab-content">
                                    <ChatsListPage />
                                </div>
                            )}

                            {/* ЗАМЕТКИ — встроенная панель под табами */}
                            {activeTab === 'notes' && (
                                <div className="list-tab-content">
                                    <NotesPage />
                                </div>
                            )}

                            {!activeTab && (
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <Rocket size={48} />
                                    </div>
                                    <h3>Добро пожаловать в ProjectHub!</h3>
                                    <p>Выберите действие в меню выше, чтобы начать работу</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Модалка редактирования */}
            {editingProject && (
                <EditProjectModal
                    project={editingProject}
                    onClose={() => setEditingProject(null)}
                    onUpdated={handleEditUpdated}
                    userRole={editingProject.userStatus || 'Member'}
                />
            )}

            {/* Модалка приглашения */}
            {invitingProject && (
                <InviteUserModal
                    project={invitingProject}
                    onClose={() => setInvitingProject(null)}
                    onInvitationSent={handleInvitationSent}
                />
            )}
        </div>
    );
};

export default ProjectsPage;