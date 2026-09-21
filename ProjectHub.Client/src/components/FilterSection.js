// projecthub.client/src/components/FilterSection.js

import React from 'react';
import { PROJECT_CATEGORIES } from '../utils/constants';
import '../styles/components/FilterSection.css';

const FilterSection = ({
    selectedCategory,
    onCategoryChange,
    onSearch,
    onReset,
    loading
}) => {
    const handleCategoryChange = (e) => {
        onCategoryChange(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch();
    };

    return (
        <form className="filter-section" onSubmit={handleSubmit}>
            <div className="filter-group">
                <label>Категория</label>
                <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    disabled={loading}
                >
                    <option value="">Все проекты</option>
                    {PROJECT_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                className="btn-search-category"
                disabled={loading}
            >
                {loading ? '⏳ Поиск…' : '🔍 Найти'}
            </button>

            <button
                type="button"
                className="btn-reset-filters"
                onClick={onReset}
                disabled={loading}
            >
                🔄 Сбросить
            </button>
        </form>
    );
};

export default FilterSection;