// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

// Импорты компонентов
import FilterSection from './components/FilterSection';
import SearchSection from './components/SearchSection';
import ProjectList from './components/ProjectList';
import CreateProjectForm from './components/CreateProjectForm';

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
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedVisibility, setSelectedVisibility] = useState('public');

    // Загрузка проектов
    const loadProjects = async () => {
        setLoading(true);
        setMessage('');
        try {
            const data = await fetchAllProjects();
            setProjects(data);
            setMessage(`📊 Найдено проектов: ${data.length}`);
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
            setMessage(`📊 Найдено проектов: ${data.length}`);
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
            setShowCreateForm(false);
            await loadProjects();
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
        loadProjects();
    };

    useEffect(() => {
        loadProjects();
    }, []);

    return (
        <div className="App">
            <header className="App-header">
                <h1>📁 ProjectHub</h1>
                <p>Управление проектами</p>
            </header>

            <main className="App-main">
                <div className="buttons-container">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="btn btn-create"
                    >
                        {showCreateForm ? '✖️ Закрыть форму' : '➕ Создать проект'}
                    </button>
                    <button
                        onClick={loadProjects}
                        disabled={loading}
                        className="btn btn-view"
                    >
                        👁️ Показать все проекты
                    </button>
                </div>

                <FilterSection
                    selectedCategory={selectedCategory}
                    selectedVisibility={selectedVisibility}
                    onFilterChange={handleFilterChange}
                    onReset={resetFilters}
                    loading={loading}
                />

                <SearchSection />

                {showCreateForm && (
                    <CreateProjectForm
                        onSubmit={handleCreateProject}
                        loading={loading}
                        onCancel={() => setShowCreateForm(false)}
                    />
                )}

                {message && (
                    <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <ProjectList
                    projects={projects}
                    loading={loading}
                    onCopyCode={(code) => {
                        navigator.clipboard.writeText(code);
                        setMessage('✅ Код скопирован в буфер обмена!');
                    }}
                />
            </main>
        </div>
    );
}

export default App;