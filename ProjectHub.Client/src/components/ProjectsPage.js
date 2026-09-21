// projecthub.client/src/components/ProjectsPage.js

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/ProjectsPage.css';
import { useNavigate } from 'react-router-dom';

import CreateProjectForm from './CreateProjectForm';
import SearchSection from './SearchSection';
import ProjectList from './ProjectList';
import FilterSection from './FilterSection';
import NotificationsDropdown from './NotificationsDropdown';
import FriendsList from './FriendsList';

import {
    fetchAllProjects,
    createProject,
    fetchMyProjects,
    fetchArchivedProjects,
} from '../services/projectsApi';
import { getFriends, removeFriend } from '../services/friendsApi';

const ProjectsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // 📌 Какое представление сейчас открыто: 'projects' | 'friends'
    const [view, setView] = useState('projects');

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState(null);

    // 📌 Только категория — без статуса
    const [selectedCategory, setSelectedCategory] = useState('');

    const [shouldResetForm, setShouldResetForm] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showMyProjectsOnly, setShowMyProjectsOnly] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    // 📌 Меню пользователя
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // 📌 Закрытие меню по клику вне / Escape
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

    // 📌 Загрузка проектов
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
                console.error('❌ Данные не являются массивом:', data);
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

    // 📌 Загрузка архивных проектов
    const loadArchivedProjects = async () => {
        setLoading(true);
        setMessage('');
        try {
            const data = await fetchArchivedProjects();
            if (Array.isArray(data)) {
                setProjects(data);
            } else {
                console.error('❌ Данные не являются массивом:', data);
                setProjects([]);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки архивных проектов:', error);
            setMessage(`❌ ${error.message || 'Ошибка загрузки архива'}`);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    // 📌 Загрузить друзей
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
        setFriends(prev => [newFriend, ...prev]);
        setMessage('✅ Друг добавлен!');
        setTimeout(() => setMessage(''), 3000);
    };

    const handleFriendRemoved = async (friendId) => {
        try {
            await removeFriend(friendId);
            setFriends(prev => prev.filter(f => f.id !== friendId));
            setMessage('✅ Друг удален');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('❌ ' + error.message);
        }
    };

    // 📌 Обработчик изменения избранного
    const handleFavoriteToggle = (publicCode, isFavorite) => {
        setProjects(prev =>
            prev.map(p => {
                if (p.publicCode !== publicCode) return p;

                const prevCount = p.favoritesCount || 0;
                const nextCount = Math.max(0, prevCount + (isFavorite ? 1 : -1));

                return {
                    ...p,
                    isFavorite,
                    favoritesCount: nextCount
                };
            })
        );
    };

    const projectListProps = {
        projects,
        loading,
        onCopyCode: (code) => {
            navigator.clipboard.writeText(code);
            setMessage('✅ Код скопирован в буфер обмена!');
            setTimeout(() => setMessage(''), 3000);
        },
        onFavoriteToggle: handleFavoriteToggle
    };

    const handleCreateProject = async (projectData) => {
        setLoading(true);
        try {
            const newProject = await createProject(projectData);
            setMessage(`✅ Проект "${newProject.name}" успешно создан! Код: ${newProject.publicCode}`);
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

    const handleCategoryChange = (value) => {
        setSelectedCategory(value);
    };

    const handleCategorySearch = () => {
        loadProjects(false, false, selectedCategory || null);
    };

    const resetFilters = () => {
        setSelectedCategory('');
        setShowFavoritesOnly(false);
        setShowMyProjectsOnly(false);
        setProjects([]);
        setMessage('');
    };

    // 📌 Обработка табов проектов
    const handleTabClick = (tab) => {
        if (activeTab === tab) {
            setActiveTab(null);
            setMessage('');
            setProjects([]);
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            return;
        }

        setActiveTab(tab);
        setMessage('');

        if (tab === 'create') {
            return;
        }

        if (tab === 'search') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            setSelectedCategory('');
            setProjects([]);
        } else if (tab === 'my') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(true);
            loadProjects(false, true);
        } else if (tab === 'favorites') {
            setShowFavoritesOnly(true);
            setShowMyProjectsOnly(false);
            loadProjects(true, false);
        } else if (tab === 'archive') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            loadArchivedProjects();
        }
    };

    // 📌 Открыть секцию друзей
    const openFriendsSection = () => {
        setView('friends');
        setActiveTab(null);
        setMessage('');
        setShowFavoritesOnly(false);
        setShowMyProjectsOnly(false);
        loadFriends();
    };

    const backToProjects = () => {
        setView('projects');
        setActiveTab(null);
        setMessage('');
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

    useEffect(() => {
        loadProjects(false, false);
    }, []);

    return (
        <div className="projects-page">
            <header className="page-header">
                <div className="header-left">
                    <h1>📁 ProjectHub</h1>
                </div>
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
                                    onClick={() => {
                                        setUserMenuOpen(false);
                                        openFriendsSection();
                                    }}
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

            <main className="page-main">
                {/* ═══════════════════════════════════════════
                    РЕЖИМ: ДРУЗЬЯ
                   ═══════════════════════════════════════════ */}
                {view === 'friends' && (
                    <>
                        <div className="view-header">
                            <button
                                className="btn-back-to-projects"
                                onClick={backToProjects}
                            >
                                ← Назад
                            </button>
                            <h2 className="view-title"> </h2>
                        </div>

                        <FriendsList
                            friends={friends}
                            loading={friendsLoading}
                            onFriendAdded={handleFriendAdded}
                            onFriendRemoved={handleFriendRemoved}
                        />
                    </>
                )}

                {/* ═══════════════════════════════════════════
                    РЕЖИМ: ПРОЕКТЫ
                   ═══════════════════════════════════════════ */}
                {view === 'projects' && (
                    <>
                        <div className="tabs-container">
                            <button
                                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                                onClick={() => handleTabClick('create')}
                            >
                                ➕ Создать проект
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                                onClick={() => handleTabClick('search')}
                            >
                                🔍 Найти проект
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                                onClick={() => handleTabClick('my')}
                            >
                                👤 Мои проекты
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                                onClick={() => handleTabClick('favorites')}
                            >
                                ⭐ Избранное
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
                                onClick={() => handleTabClick('archive')}
                            >
                                📦 Архив
                            </button>
                            <button
                                className="tab-btn"
                                onClick={() => navigate('/chats')}
                                title="Чаты"
                            >
                                💬 Чаты
                            </button>
                            <button
                                className="tab-btn"
                                onClick={() => navigate('/notes')}
                                title="Мои заметки"
                            >
                                📝 Мои заметки
                            </button>
                        </div>

                        {message && (
                            <div className={`message ${message.includes('❌') || message.includes('Ошибка') ? 'error' : 'success'}`}>
                                {message}
                            </div>
                        )}

                        <div className="tab-content">
                            {activeTab === 'create' && (
                                <CreateProjectForm
                                    onSubmit={handleCreateProject}
                                    loading={loading}
                                    onCancel={() => setActiveTab(null)}
                                    resetForm={shouldResetForm}
                                />
                            )}

                            {activeTab === 'search' && (
                                <div className="search-tab-content">
                                    <SearchSection />

                                    <div className="search-filters">
                                        <h4>Или найдите по категории:</h4>
                                        <FilterSection
                                            selectedCategory={selectedCategory}
                                            onCategoryChange={handleCategoryChange}
                                            onSearch={handleCategorySearch}
                                            onReset={resetFilters}
                                            loading={loading}
                                        />
                                    </div>

                                    {projects.length > 0 && (
                                        <div className="search-results">
                                            <ProjectList {...projectListProps} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'my' && (
                                <div className="list-tab-content">
                                    {projects.length === 0 ? (
                                        <div className="empty-state-my">
                                            <div className="empty-state-icon">👤</div>
                                            <h3>Нет проектов</h3>
                                            <p>Вы пока не участвуете ни в одном проекте</p>
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleTabClick('search')}
                                            >
                                                🔍 Найти проект
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
                                        <div className="empty-state-favorites">
                                            <div className="empty-state-icon">⭐</div>
                                            <h3>Нет избранных проектов</h3>
                                            <p>Добавляйте проекты в избранное, чтобы быстро находить их здесь</p>
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleTabClick('my')}
                                            >
                                                👤 Перейти к моим проектам
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
                                        <div className="empty-state-archive">
                                            <div className="empty-state-icon">📦</div>
                                            <h3>Архив пуст</h3>
                                            <p>Здесь будут проекты, которые вы архивировали</p>
                                        </div>
                                    ) : (
                                        <ProjectList {...projectListProps} />
                                    )}
                                </div>
                            )}

                            {!activeTab && (
                                <div className="empty-state">
                                    <div className="empty-state-icon">🚀</div>
                                    <h3>Добро пожаловать в ProjectHub!</h3>
                                    <p>Выберите действие в меню выше, чтобы начать работу</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default ProjectsPage;