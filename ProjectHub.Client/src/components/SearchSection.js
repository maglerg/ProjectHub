// src/components/SearchSection.js

import React, { useState } from 'react';
import { searchProjectByCode } from '../services/projectsApi';
import '../styles/components/SearchSection.css';

const SearchSection = ({ onProjectFound }) => {
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

    return (
        <div className="search-section">
            <div className="search-header">
                <h3>🔍 Поиск проекта по коду</h3>
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
                        <button className="search-clear-btn" onClick={() => setSearchCode('')}>
                            ✕
                        </button>
                    )}
                </div>
                <button
                    onClick={handleSearch}
                    className="btn btn-search"
                    disabled={isSearching || !searchCode.trim()}
                >
                    {isSearching ? '⏳ Поиск...' : '🔍 Найти'}
                </button>
                {foundProject && (
                    <button onClick={clearResults} className="btn btn-clear-search">
                        ✖️ Очистить
                    </button>
                )}
            </div>

            {message && (
                <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            {/* 📌 Карточка найденного проекта */}
            {foundProject && (
                <div className="found-project-card">
                    <div className="found-project-header">
                        <h4>{foundProject.name}</h4>
                        <span className={`visibility-tag ${foundProject.visibility === 'Private' ? 'private' : 'public'}`}>
                            {foundProject.visibility === 'Private' ? '🔒 Приватный' : '🌐 Публичный'}
                        </span>
                    </div>
                    <div className="found-project-info">
                        <span>📂 {foundProject.category}</span>
                        <span>📅 {new Date(foundProject.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                    {foundProject.description && (
                        <p className="found-project-description">{foundProject.description}</p>
                    )}
                    <button
                        className="btn-go-to-project"
                        onClick={() => window.location.href = `/projects/${foundProject.publicCode}`}
                    >
                        📂 Перейти к проекту
                    </button>
                </div>
            )}

            {searchHistory.length > 0 && (
                <div className="search-history">
                    <div className="history-header">
                        <span>📋 История поиска:</span>
                        <button className="clear-history-btn" onClick={() => setSearchHistory([])}>
                            Очистить историю
                        </button>
                    </div>
                    <div className="history-tags">
                        {searchHistory.map((item, index) => (
                            <button
                                key={index}
                                className="history-tag"
                                onClick={() => quickSearch(item.code)}
                            >
                                🔑 {item.code}
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