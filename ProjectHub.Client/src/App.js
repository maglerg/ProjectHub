// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

// Импорты компонентов
import CreateProjectForm from './components/CreateProjectForm';
import SearchSection from './components/SearchSection';
import ProjectList from './components/ProjectList';
import FilterSection from './components/FilterSection';

// Импорты API
import {
    fetchAllProjects,
    createProject,
    fetchProjectsWithFilters
} from './services/projectsApi';

function App() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Активная вкладка: 'create' | 'search' | 'list' | null
    const [activeTab, setActiveTab] = useState(null);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedVisibility, setSelectedVisibility] = useState('public');

    // 🆕 Флаг для сброса формы после создания
    const [shouldResetForm, setShouldResetForm] = useState(false);

    // Загрузка всех проектов
    const loadAllProjects = async () => {
        setLoading(true);
        setMessage('');
        try {
            const data = await fetchAllProjects();
            setProjects(data);
            if (data.length === 0) {
                setMessage('📭 Нет созданных проектов');
            } else {
                setMessage(`📊 Найдено проектов: ${data.length}`);
            }
        } catch (error) {
            setMessage(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка с фильтрами
    const loadProjectsWithFilters = async (category, visibility) => {
        setLoading(true);
        setMessage('');
        try {
            const data = await fetchProjectsWithFilters(category, visibility);
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

    // 🆕 Создание проекта — остаёмся на форме
    const handleCreateProject = async (projectData) => {
        setLoading(true);
        try {
            const newProject = await createProject(projectData);
            setMessage(`✅ Проект "${newProject.name}" успешно создан! Код: ${newProject.publicCode}`);

            // ✅ ОСТАЕМСЯ на форме создания
            // Обновляем список проектов в фоне
            await loadAllProjects();

            // 🆕 Сигнализируем форме, что нужно сбросить поля
            setShouldResetForm(true);
            // Сбрасываем флаг через мгновение
            setTimeout(() => setShouldResetForm(false), 100);

        } catch (error) {
            setMessage(`❌ Ошибка: ${error.message || 'Проверьте введенные данные'}`);
        } finally {
            setLoading(false);
        }
    };

    // Обработка изменения фильтров
    const handleFilterChange = (type, value) => {
        if (type === 'category') {
            setSelectedCategory(value);
            loadProjectsWithFilters(value, selectedVisibility);
        } else if (type === 'visibility') {
            setSelectedVisibility(value);
            loadProjectsWithFilters(selectedCategory, value);
        }
    };

    // Сброс фильтров
    const resetFilters = () => {
        setSelectedCategory('');
        setSelectedVisibility('public');
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

    return (
        <div className="App">
            <header className="App-header">
                <h1>📁 ProjectHub</h1>
                <p className="header-description">Управление проектами</p>
            </header>

            <main className="App-main">
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
                    <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
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
                            resetForm={shouldResetForm}  // 🆕 Передаём флаг сброса
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
                                        onCopyCode={(code) => {
                                            navigator.clipboard.writeText(code);
                                            setMessage('✅ Код скопирован в буфер обмена!');
                                        }}
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
                                onCopyCode={(code) => {
                                    navigator.clipboard.writeText(code);
                                    setMessage('✅ Код скопирован в буфер обмена!');
                                }}
                            />
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
            </main>
        </div>
    );
}

export default App;