// src/components/FilterSection.js
import React from 'react';
import { CATEGORIES } from '../utils/constants';
import '../styles/components/FilterSection.css'; 

const FilterSection = ({
    selectedCategory,
    selectedVisibility,
    onFilterChange,
    onReset,
    loading
}) => {
    return (
        <div className="filter-section">
            <h3>🔍 Фильтр проектов</h3>
            <div className="filter-controls">
                <div className="filter-group">
                    <label>Категория:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => onFilterChange('category', e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Все категории</option>
                        {Object.entries(CATEGORIES).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Видимость:</label>
                    <select
                        value={selectedVisibility}
                        onChange={(e) => onFilterChange('visibility', e.target.value)}
                        className="filter-select"
                    >
                        <option value="public">📢 Публичные</option>
                        <option value="private">🔒 Приватные</option>
                        <option value="all">👁️ Все</option>
                    </select>
                </div>

                <button
                    onClick={onReset}
                    className="btn btn-reset-filters"
                    disabled={loading}
                >
                    🔄 Сбросить фильтры
                </button>
            </div>
        </div>
    );
};

export default FilterSection;