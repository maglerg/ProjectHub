// projecthub.client/src/components/FilterSection.js

import React from 'react';
import { PROJECT_CATEGORIES, PROJECT_VISIBILITY } from '../utils/constants';
import '../styles/components/FilterSection.css';

const FilterSection = ({
    selectedCategory,
    selectedVisibility,
    onFilterChange,
    onReset,
    loading
}) => {
    const handleCategoryChange = (e) => {
        onFilterChange('category', e.target.value);
    };

    const handleVisibilityChange = (e) => {
        onFilterChange('visibility', e.target.value);
    };

    return (
        <div className="filter-section">
            <div className="filter-group">
                <label>Категория</label>
                <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    disabled={loading}
                >
                    <option value="">Все категории</option>
                    {PROJECT_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>Видимость</label>
                <select
                    value={selectedVisibility}
                    onChange={handleVisibilityChange}
                    disabled={loading}
                >
                    <option value="">Все</option>
                    {PROJECT_VISIBILITY.map(vis => (
                        <option key={vis.value} value={vis.value}>
                            {vis.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                className="btn-reset-filters"
                onClick={onReset}
                disabled={loading}
            >
                🔄 Сбросить
            </button>
        </div>
    );
};

export default FilterSection;