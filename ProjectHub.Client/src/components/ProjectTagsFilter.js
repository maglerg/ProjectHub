// src/components/ProjectTagsFilter.js

import React, { useState, useEffect, useRef } from 'react';
import { getAllProjectTags } from '../services/projectTagsApi';
import '../styles/components/ProjectTagsFilter.css';
import '../styles/components/ProjectTagsFilter.css';

const MAX_TAGS = 5;

export default function ProjectTagsFilter({
    selectedTagIds = [],
    onChange,               // (newTagIds[]) => void
    onSearch,               // () => void — вызвать поиск
    disabled = false,
}) {
    const [allTags, setAllTags] = useState([]);
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await getAllProjectTags({ take: 200 });
                setAllTags(data || []);
            } catch (e) {
                console.error('Ошибка загрузки тегов:', e);
            }
        })();
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = allTags.filter(t =>
        t.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    const toggleTag = (tagId) => {
        if (disabled) return;

        const set = new Set(selectedTagIds);
        if (set.has(tagId)) set.delete(tagId);
        else if (set.size < MAX_TAGS) set.add(tagId);
        onChange(Array.from(set));
    };

    const selectedTags = selectedTagIds
        .map(id => allTags.find(t => t.id === id))
        .filter(Boolean);

    return (
        <div className="project-tags-filter" ref={wrapperRef}>
            <div className="project-tags-filter__label">
                🏷️ Фильтр по тегам
                {selectedTagIds.length > 0 && (
                    <span className="project-tags-filter__count">
                        {selectedTagIds.length}/{MAX_TAGS}
                    </span>
                )}
            </div>

            {selectedTags.length > 0 && (
                <div className="project-tag-picker__selected">
                    {selectedTags.map(t => (
                        <span
                            key={t.id}
                            className="project-tag-chip"
                            style={{
                                backgroundColor: t.color ? `${t.color}22` : '#eef2ff',
                                color: t.color || '#4f46e5',
                                borderColor: t.color || '#c7d2fe'
                            }}
                        >
                            {t.name}
                            <button
                                type="button"
                                className="project-tag-chip__remove"
                                onClick={() => toggleTag(t.id)}
                                title="Убрать тег"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div
                className={`project-tag-picker__input-wrap ${isOpen ? 'open' : ''}`}
                onClick={() => !disabled && setIsOpen(v => !v)}
            >
                <span className="project-tag-picker__icon">🔍</span>
                <input
                    type="text"
                    className="project-tag-picker__input"
                    placeholder="Выбрать теги для поиска…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                />
            </div>

            {isOpen && !disabled && (
                <div className="project-tag-picker__dropdown">
                    {filtered.length === 0 ? (
                        <div className="project-tag-picker__empty">
                            {search.trim()
                                ? `Тег «${search}» не найден`
                                : 'Теги не найдены'}
                        </div>
                    ) : (
                        <div className="project-tag-picker__list">
                            {filtered.map(t => {
                                const checked = selectedTagIds.includes(t.id);
                                const disabledByLimit =
                                    !checked && selectedTagIds.length >= MAX_TAGS;

                                return (
                                    <label
                                        key={t.id}
                                        className={`project-tag-picker__item ${checked ? 'checked' : ''} ${disabledByLimit ? 'disabled' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabledByLimit}
                                            onChange={() => toggleTag(t.id)}
                                        />
                                        <span
                                            className="project-tag-picker__dot"
                                            style={{ backgroundColor: t.color || '#9ca3af' }}
                                        />
                                        <span className="project-tag-picker__name">{t.name}</span>
                                        <span className="project-tag-picker__count">
                                            {t.projectsCount} проектов
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="project-tags-filter__actions">
                <button
                    type="button"
                    className="project-tags-filter__search-btn"
                    onClick={onSearch}
                    disabled={disabled || selectedTagIds.length === 0}
                >
                    🔍 Найти проекты
                </button>
                {selectedTagIds.length > 0 && (
                    <button
                        type="button"
                        className="project-tags-filter__reset-btn"
                        onClick={() => onChange([])}
                        disabled={disabled}
                    >
                        Сбросить
                    </button>
                )}
            </div>
        </div>
    );
}