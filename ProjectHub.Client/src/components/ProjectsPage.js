// projecthub.client/src/components/ProjectsPage.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/ProjectsPage.css';
import { useNavigate } from 'react-router-dom';

// Импорты компонентов
import CreateProjectForm from './CreateProjectForm';
import SearchSection from './SearchSection';
import ProjectList from './ProjectList';
import FilterSection from './FilterSection';
import NotificationsDropdown from './NotificationsDropdown';
import FriendsList from './FriendsList';

// Импорты API
import {
    fetchAllProjects,
    createProject,
    fetchProjectsWithFilters,
    fetchMyProjects,
} from '../services/projectsApi';
import { getFriends, removeFriend } from '../services/friendsApi';  // ← ДОБАВИТЬ!

const ProjectsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [shouldResetForm, setShouldResetForm] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showMyProjectsOnly, setShowMyProjectsOnly] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    // 📌 Загрузка проектов
    const loadProjects = async (favoritesOnly = false, myProjectsOnly = false) => {
        setLoading(true);
        setMessage('');
        try {
            let label = '(все)';
            if (favoritesOnly) label = '(только избранные)';
            else if (myProjectsOnly) label = '(только мои)';

            console.log('🔍 Загрузка проектов...', label);

            let data;
            if (myProjectsOnly) {
                data = await fetchMyProjects();
            } else {
                data = await fetchAllProjects(favoritesOnly);
            }

            console.log('📦 Данные с сервера:', data);

            if (Array.isArray(data)) {
                setProjects(data);
                if (data.length === 0) {
                    if (favoritesOnly) {
                        setMessage('⭐ Нет избранных проектов');
                    } else if (myProjectsOnly) {
                        setMessage('📭 Вы не участвуете ни в одном проекте');
                    } else {
                        setMessage('📭 Нет созданных проектов');
                    }
                } else {
                    setMessage(`✅ Найдено проектов: ${data.length}`);
                }
            } else {
                console.error('❌ Данные не являются массивом:', data);
                setProjects([]);
                setMessage('❌ Ошибка: получены некорректные данные');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки проектов:', error);
            setMessage(`❌ ${error.message || 'Ошибка загрузки проектов'}`);
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

    // 📌 Обработчик добавления друга
    const handleFriendAdded = (newFriend) => {
        setFriends(prev => [newFriend, ...prev]);
        setMessage('✅ Друг добавлен!');
        setTimeout(() => setMessage(''), 3000);
    };

    // 📌 Обработчик удаления друга
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

    // Загрузка с фильтрами
    const loadProjectsWithFilters = async (category, visibility, status) => {
        setLoading(true);
        setMessage('');
        try {
            const data = await fetchProjectsWithFilters(category, visibility, status);
            setProjects(data);
            if (data.length === 0) {
                setMessage('📭 Нет проектов, соответствующих фильтрам');
            } else {
                setMessage(`📊 Найдено проектов: ${data.length}`);
            }
        } catch (error) {
            setMessage(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Создание проекта
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

    // Убираем из handleFilterChange обработку visibility
    const handleFilterChange = (type, value) => {
        if (type === 'category') {
            setSelectedCategory(value);
            loadProjectsWithFilters(value, selectedStatus);
        } else if (type === 'status') {
            setSelectedStatus(value);
            loadProjectsWithFilters(selectedCategory, value);
        }
    };

    // Сброс фильтров
    const resetFilters = () => {
        setSelectedCategory('');
        setSelectedStatus('');
        setShowFavoritesOnly(false);
        setShowMyProjectsOnly(false);
        loadProjects(false, false);
    };

    // 📌 Обработчик клика по табу (ОДНА ФУНКЦИЯ!)
    const handleTabClick = (tab) => {
        if (activeTab === tab) {
            // Если уже активен — закрываем
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

        if (tab === 'list') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            loadProjects(false, false);
        } else if (tab === 'favorites') {
            setShowFavoritesOnly(true);
            setShowMyProjectsOnly(false);
            loadProjects(true, false);
        } else if (tab === 'my') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(true);
            loadProjects(false, true);
        } else if (tab === 'friends') {
            loadFriends();
        } else if (tab === 'search') {
            setShowFavoritesOnly(false);
            setShowMyProjectsOnly(false);
            loadProjects(false, false);
        }
    };

    // Копирование кода
    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setMessage('✅ Код скопирован в буфер обмена!');
        setTimeout(() => setMessage(''), 3000);
    };

    // Загрузка при первом рендере
    useEffect(() => {
        loadProjects(false, false);
    }, []);

    return (
        <div className="projects-page">
            <header className="page-header">
                <div className="header-left">
                    <h1>📁 ProjectHub</h1>
                    <span className="user-greeting">Привет, {user?.name}!</span>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <span className="user-specialization">
                            {user?.specialization}
                        </span>
                        <span className={`user-status ${user?.isOnline ? 'online' : 'offline'}`}>
                            {user?.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'}
                        </span>
                    </div>
                    <NotificationsDropdown />
                    <button
                        className="btn-profile"
                        onClick={() => navigate('/profile')}
                        title="Профиль"
                    >
                        👤 Профиль
                    </button>
                    <button className="btn-logout" onClick={logout}>
                        🚪 Выйти
                    </button>
                </div>
            </header>

            <main className="page-main">
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
                        className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                        onClick={() => handleTabClick('list')}
                    >
                        📋 Все проекты
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
                        className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                        onClick={() => handleTabClick('friends')}
                    >
                        👥 Друзья
                    </button>
                    <button
                        className="btn-chats"
                        onClick={() => navigate('/chats')}
                        title="Чаты"
                    >
                        💬 Чаты
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
                            <SearchSection
                                onProjectFound={(project) => {
                                    if (project) {
                                        setMessage(`✅ Найден проект: ${project.name}`);
                                    }
                                }}
                            />

                            <div className="search-filters">
                                <h4>Или ищите по категории:</h4>
                                <FilterSection
                                    selectedCategory={selectedCategory}
                                    selectedStatus={selectedStatus}
                                    onFilterChange={handleFilterChange}
                                    onReset={resetFilters}
                                    loading={loading}
                                />
                            </div>

                            {projects.length > 0 && (
                                <div className="search-results">
                                    <h4>Результаты поиска:</h4>
                                    <ProjectList
                                        projects={projects}
                                        loading={loading}
                                        onCopyCode={handleCopyCode}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="list-tab-content">
                            <ProjectList
                                projects={projects}
                                loading={loading}
                                onCopyCode={handleCopyCode}
                            />
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
                                        onClick={() => handleTabClick('list')}
                                    >
                                        📋 Посмотреть все проекты
                                    </button>
                                </div>
                            ) : (
                                <ProjectList
                                    projects={projects}
                                    loading={loading}
                                    onCopyCode={handleCopyCode}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'friends' && (
                        <div className="friends-tab-content">
                            <FriendsList
                                friends={friends}
                                loading={friendsLoading}
                                onFriendAdded={handleFriendAdded}
                                onFriendRemoved={handleFriendRemoved}
                            />
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
                                        onClick={() => handleTabClick('list')}
                                    >
                                        📋 Перейти к проектам
                                    </button>
                                </div>
                            ) : (
                                <ProjectList
                                    projects={projects}
                                    loading={loading}
                                    onCopyCode={handleCopyCode}
                                />
                            )}
                        </div>
                    )}

                    {!activeTab && (
                        <div className="empty-state">
                            <div className="empty-state-icon">🚀</div>
                            <h3>Добро пожаловать в ProjectHub!</h3>
                            <p>Выберите действие в меню выше, чтобы начать работу</p>
                            <div className="quick-stats">
                                {user && (
                                    <div className="stat-item">
                                        <span className="stat-label">👤 Пользователь:</span>
                                        <span className="stat-value">{user.name}</span>
                                    </div>
                                )}
                                <div className="stat-item">
                                    <span className="stat-label">📊 Специализация:</span>
                                    <span className="stat-value">{user?.specialization || 'Не указана'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ProjectsPage;