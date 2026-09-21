// src/components/ProjectTagPicker.js

import React, { useState, useEffect, useRef } from 'react';
import {
    getAllProjectTags,
    createProjectTag
} from '../services/projectTagsApi';
import '../styles/components/ProjectTagsFilter.css';

const MAX_TAGS = 15;

export default function ProjectTagPicker({
    selectedTagIds = [],
    onChange,               // (newTagIds[]) => void
    disabled = false,
}) {
    const [allTags, setAllTags] = useState([]);
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTagColor, setNewTagColor] = useState('#4f46e5');
    const [error, setError] = useState(null);

    const wrapperRef = useRef(null);

    // ── Загрузка тегов ──
    const loadTags = async () => {
        setLoading(true);
        try {
            const data = await getAllProjectTags({ take: 200 });
            setAllTags(data || []);
        } catch (err) {
            console.error('❌ Ошибка загрузки тегов:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTags();
    }, []);

    // ── Закрытие по клику вне ──
    useEffect(() => {
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setError(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Фильтрация по поиску ──
    const filtered = allTags.filter(t =>
        t.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    const toggleTag = (tagId) => {
        if (disabled) return;

        const set = new Set(selectedTagIds);
        if (set.has(tagId)) {
            set.delete(tagId);
        } else {
            if (set.size >= MAX_TAGS) {
                setError(`Максимум ${MAX_TAGS} тегов`);
                return;
            }
            set.add(tagId);
        }
        setError(null);
        onChange(Array.from(set));
    };

    const selectedTags = selectedTagIds
        .map(id => allTags.find(t => t.id === id))
        .filter(Boolean);

    // ── Создание нового тега ──
    const handleCreate = async () => {
        const name = search.trim();
        if (!name || creating) return;

        // Если такой тег уже есть в списке — просто выбираем его
        const existing = allTags.find(
            t => t.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
            if (!selectedTagIds.includes(existing.id)) {
                toggleTag(existing.id);
            }
            setSearch('');
            return;
        }

        setCreating(true);
        setError(null);
        try {
            const newTag = await createProjectTag({
                name,
                color: newTagColor
            });
            setAllTags(prev =>
                [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
            );
            // Сразу выбираем созданный тег
            if (!selectedTagIds.includes(newTag.id)) {
                onChange([...selectedTagIds, newTag.id]);
            }
            setSearch('');
            setNewTagColor('#4f46e5');
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="project-tag-picker" ref={wrapperRef}>
            {/* ── Выбранные теги ── */}
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
                            {!disabled && (
                                <button
                                    type="button"
                                    className="project-tag-chip__remove"
                                    onClick={() => toggleTag(t.id)}
                                    title="Убрать тег"
                                >
                                    ×
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* ── Поле поиска / триггер ── */}
            <div
                className={`project-tag-picker__input-wrap ${isOpen ? 'open' : ''}`}
                onClick={() => !disabled && setIsOpen(v => !v)}
            >
                <span className="project-tag-picker__icon">🏷️</span>
                <input
                    type="text"
                    className="project-tag-picker__input"
                    placeholder={
                        selectedTagIds.length > 0
                            ? `Выбрано: ${selectedTagIds.length}/${MAX_TAGS}`
                            : 'Добавить теги…'
                    }
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={() => !disabled && setIsOpen(true)}
                    disabled={disabled}
                />
                {search && (
                    <button
                        type="button"
                        className="project-tag-picker__clear"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSearch('');
                        }}
                    >
                        ×
                    </button>
                )}
            </div>

            {/* ── Дропдаун ── */}
            {isOpen && !disabled && (
                <div className="project-tag-picker__dropdown">
                    {loading ? (
                        <div className="project-tag-picker__empty">Загрузка…</div>
                    ) : (
                        <>
                            {filtered.length > 0 && (
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
                                                <span className="project-tag-picker__name">
                                                    {t.name}
                                                </span>
                                                <span className="project-tag-picker__count">
                                                    {t.projectsCount} проектов
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {filtered.length === 0 && search.trim() && (
                                <div className="project-tag-picker__empty">
                                    Тег «{search.trim()}» не найден
                                </div>
                            )}

                            {!search.trim() && filtered.length === 0 && !loading && (
                                <div className="project-tag-picker__empty">
                                    Тегов пока нет — создайте первый
                                </div>
                            )}

                            {/* ── Создание нового тега ── */}
                            {search.trim() &&
                                !filtered.some(
                                    t => t.name.toLowerCase() === search.trim().toLowerCase()
                                ) && (
                                    <div className="project-tag-picker__create">
                                        <input
                                            type="color"
                                            value={newTagColor}
                                            onChange={e => setNewTagColor(e.target.value)}
                                            title="Цвет нового тега"
                                        />
                                        <button
                                            type="button"
                                            className="project-tag-picker__create-btn"
                                            onClick={handleCreate}
                                            disabled={creating}
                                        >
                                            {creating
                                                ? '…'
                                                : `+ Создать «${search.trim()}»`}
                                        </button>
                                    </div>
                                )}

                            {error && (
                                <div className="project-tag-picker__error">
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}