// projecthub.client/src/components/FilterSection.js

import React from 'react';
import { Search, RotateCcw, Loader2 } from 'lucide-react';
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
                className="btn btn--primary"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 size={16} className="icon-spin" />
                        Поиск…
                    </>
                ) : (
                    <>
                        <Search size={16} />
                        Найти
                    </>
                )}
            </button>

            <button
                type="button"
                className="btn btn--secondary"
                onClick={onReset}
                disabled={loading}
            >
                <RotateCcw size={16} />
                Сбросить
            </button>
        </form>
    );
};

export default FilterSection;