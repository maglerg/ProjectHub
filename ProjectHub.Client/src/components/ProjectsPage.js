// projecthub.client/src/components/ProjectsPage.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/ProjectsPage.css';

// Импорты компонентов
import CreateProjectForm from './CreateProjectForm';
import SearchSection from './SearchSection';
import ProjectList from './ProjectList';
import FilterSection from './FilterSection';

// Импорты API
import {
    fetchAllProjects,
    createProject,
    fetchProjectsWithFilters
} from '../services/projectsApi';

const ProjectsPage = () => {
    const { user, logout } = useAuth();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedVisibility, setSelectedVisibility] = useState('Public');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [shouldResetForm, setShouldResetForm] = useState(false);

    // Загрузка всех проектов
    const loadAllProjects = async () => {
        setLoading(true);
        setMessage('');
        try {
            console.log('🔍 Загрузка проектов...');
            const data = await fetchAllProjects();

            console.log('📦 Данные с сервера:', data);

            if (Array.isArray(data)) {
                setProjects(data);
                if (data.length === 0) {
                    setMessage('📭 Нет созданных проектов');
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
            await loadAllProjects();
            setShouldResetForm(true);
            setTimeout(() => setShouldResetForm(false), 100);
        } catch (error) {
            setMessage(`❌ Ошибка: ${error.message || 'Проверьте введенные данные'}`);
        } finally {
            setLoading(false);
        }
    };

    // 📌 Обработка изменения фильтров (ОДНА ФУНКЦИЯ)
    const handleFilterChange = (type, value) => {
        if (type === 'category') {
            setSelectedCategory(value);
            loadProjectsWithFilters(value, selectedVisibility, selectedStatus);
        } else if (type === 'visibility') {
            setSelectedVisibility(value);
            loadProjectsWithFilters(selectedCategory, value, selectedStatus);
        } else if (type === 'status') {
            setSelectedStatus(value);
            loadProjectsWithFilters(selectedCategory, selectedVisibility, value);
        }
    };

    // Сброс фильтров
    const resetFilters = () => {
        setSelectedCategory('');
        setSelectedVisibility('Public');
        setSelectedStatus('');
        loadAllProjects();
    };

    // Обработчик клика по табу
    const handleTabClick = (tab) => {
        if (activeTab === tab) {
            setActiveTab(null);
            setMessage('');
            setProjects([]);
        } else {
            setActiveTab(tab);
            setMessage('');
            if (tab === 'list') {
                loadAllProjects();
            }
        }
    };

    // Копирование кода
    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setMessage('✅ Код скопирован в буфер обмена!');
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="projects-page">
            {/* Шапка с пользователем */}
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
                    <button className="btn-logout" onClick={logout}>
                        🚪 Выйти
                    </button>
                </div>
            </header>

            <main className="page-main">
                {/* Кнопки-табы */}
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
                </div>

                {/* Сообщения */}
                {message && (
                    <div className={`message ${message.includes('❌') || message.includes('Ошибка') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                {/* Контент активной вкладки */}
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
                                    selectedVisibility={selectedVisibility}
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