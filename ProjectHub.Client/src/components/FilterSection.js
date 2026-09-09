// projecthub.client/src/components/FilterSection.js

import React from 'react';
import { PROJECT_CATEGORIES } from '../utils/constants';  
import '../styles/components/FilterSection.css';

const FilterSection = ({
    selectedCategory,
    selectedStatus,
    onFilterChange,
    onReset,
    loading
}) => {
    const handleCategoryChange = (e) => {
        onFilterChange('category', e.target.value);
    };

    const handleStatusChange = (e) => {
        onFilterChange('status', e.target.value);
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
                <label>Статус</label>
                <select
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    disabled={loading}
                >
                    <option value="">Все статусы</option>
                    <option value="Completed">✅ Завершен</option>
                    <option value="Uncompleted">⏳ В процессе</option>
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