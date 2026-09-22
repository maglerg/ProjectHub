// src/components/SearchSection.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    X,
    Loader2,
    Folder,
    Calendar,
    KeyRound,
    ClipboardList,
    Lock,
    Globe,
    Check,
    AlertCircle,
} from 'lucide-react';
import { searchProjectByCode } from '../services/projectsApi';
import '../styles/components/SearchSection.css';

const SearchSection = ({ onProjectFound }) => {
    const navigate = useNavigate();
    const [searchCode, setSearchCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [message, setMessage] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);
    const [foundProject, setFoundProject] = useState(null);

    const addToSearchHistory = (code, projectName) => {
        const newEntry = { code, projectName, timestamp: new Date().toLocaleString() };
        setSearchHistory(prev => {
            const filtered = prev.filter(item => item.code !== code);
            return [newEntry, ...filtered].slice(0, 10);
        });
    };

    const handleSearch = async () => {
        if (!searchCode.trim()) {
            setMessage('❌ Введите код проекта');
            return;
        }

        setIsSearching(true);
        setMessage('');
        setFoundProject(null);

        try {
            const project = await searchProjectByCode(searchCode);

            if (project) {
                setFoundProject(project);
                setMessage(`✅ Проект найден!`);
                addToSearchHistory(searchCode, project.name);
                if (onProjectFound) onProjectFound(project);
            } else {
                setMessage('❌ Проект с таким кодом не найден');
                setFoundProject(null);
                if (onProjectFound) onProjectFound(null);
            }
        } catch (error) {
            setMessage(`❌ ${error.message}`);
            setFoundProject(null);
        } finally {
            setIsSearching(false);
        }
    };

    // 📌 Обработчик перехода к проекту
    const handleGoToProject = () => {
        if (!foundProject?.publicCode) return;

        const userStatus = foundProject.userStatus || 'NotJoined';
        const isMember = userStatus === 'Owner' || userStatus === 'Admin' || userStatus === 'Member';

        if (isMember) {
            // ✅ Участник → открываем дашборд (приватная версия)
            navigate(`/projects/${foundProject.publicCode}/dashboard`);
        } else {
            // ❌ Не участник → открываем публичную страницу
            navigate(`/projects/${foundProject.publicCode}`);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const clearResults = () => {
        setFoundProject(null);
        setSearchCode('');
        setMessage('');
        if (onProjectFound) onProjectFound(null);
    };

    const quickSearch = (code) => {
        setSearchCode(code);
        setTimeout(handleSearch, 100);
    };

    const isError = message.includes('❌');

    return (
        <div className="search-section">
            <div className="search-header">
                <h3>
                    <Search size={18} />
                    Поиск проекта по коду
                </h3>
                <span className="search-hint">Введите код в формате ABC-123-DEF</span>
            </div>

            <div className="search-form">
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        placeholder="Например: ABC-123-DEF"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        className="search-input"
                        disabled={isSearching}
                    />
                    {searchCode && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm search-clear-btn"
                            onClick={() => setSearchCode('')}
                            aria-label="Очистить поле"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleSearch}
                    className="btn btn--primary"
                    disabled={isSearching || !searchCode.trim()}
                >
                    {isSearching ? (
                        <>
                            <Loader2 size={16} className="icon-spin" />
                            Поиск...
                        </>
                    ) : (
                        <>
                            <Search size={16} />
                            Найти
                        </>
                    )}
                </button>
                {foundProject && (
                    <button
                        type="button"
                        onClick={clearResults}
                        className="btn btn--secondary"
                    >
                        <X size={16} />
                        Очистить
                    </button>
                )}
            </div>

            {message && (
                <div className={`message ${isError ? 'error' : 'success'}`}>
                    {isError ? <AlertCircle size={14} /> : <Check size={14} />}
                    {message.replace(/^[❌✅]\s*/, '')}
                </div>
            )}

            {/* 📌 Карточка найденного проекта */}
            {foundProject && (
                <div className="found-project-card">
                    <div className="found-project-header">
                        <h4>{foundProject.name}</h4>
                        <span className={`visibility-tag ${foundProject.visibility === 'Private' ? 'private' : 'public'}`}>
                            {foundProject.visibility === 'Private' ? (
                                <>
                                    <Lock size={12} />
                                    Приватный
                                </>
                            ) : (
                                <>
                                    <Globe size={12} />
                                    Публичный
                                </>
                            )}
                        </span>
                    </div>
                    <div className="found-project-info">
                        <span>
                            <Folder size={14} />
                            {foundProject.category}
                        </span>
                        <span>
                            <Calendar size={14} />
                            {new Date(foundProject.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                    </div>
                    {foundProject.description && (
                        <p className="found-project-description">{foundProject.description}</p>
                    )}
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleGoToProject}
                    >
                        <Folder size={16} />
                        Перейти к проекту
                    </button>
                </div>
            )}

            {searchHistory.length > 0 && (
                <div className="search-history">
                    <div className="history-header">
                        <span>
                            <ClipboardList size={14} />
                            История поиска:
                        </span>
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setSearchHistory([])}
                        >
                            Очистить историю
                        </button>
                    </div>
                    <div className="history-tags">
                        {searchHistory.map((item, index) => (
                            <button
                                key={index}
                                type="button"
                                className="btn btn--secondary btn--sm search-history-tag"
                                onClick={() => quickSearch(item.code)}
                            >
                                <KeyRound size={12} />
                                {item.code}
                                <span className="history-project-name">{item.projectName}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchSection;