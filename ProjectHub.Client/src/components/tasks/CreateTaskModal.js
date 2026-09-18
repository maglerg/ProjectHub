import React, { useState } from 'react';
import { TASK_PRIORITIES } from '../../utils/constants';
import { toLocalInputValue, validateDateRange } from '../../utils/datetime';

export default function CreateTaskModal({
    columns,
    projectDeadline,
    allTags = [],
    onCreate,
    onClose,
    onCreateTag          // опциональный колбэк: создать тег в проекте
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [columnId, setColumnId] = useState(columns[0]?.id || '');
    const [priority, setPriority] = useState('None');

    // ── Дата начала ──
    const [startDate, setStartDate] = useState('');
    const [noStartDate, setNoStartDate] = useState(true);

    // ── Дедлайн ──
    const [dueDate, setDueDate] = useState('');
    const [noDueDate, setNoDueDate] = useState(true);

    // ── Теги ──
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#4f46e5');
    const [tagSubmitting, setTagSubmitting] = useState(false);
    const [tagError, setTagError] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState(null);

    const projectDeadlineDate = projectDeadline ? new Date(projectDeadline) : null;
    const maxDate =
        projectDeadlineDate && projectDeadlineDate > new Date()
            ? toLocalInputValue(projectDeadlineDate)
            : '';

    // ── Переключение тега ──
    const toggleTag = (tagId) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : prev.length >= 10
                    ? prev
                    : [...prev, tagId]
        );
    };

    // ── Создание нового тега (если передан onCreateTag) ──
    const handleCreateTag = async (e) => {
        e.preventDefault();
        const name = newTagName.trim();
        if (!name || !onCreateTag || tagSubmitting) return;

        setTagSubmitting(true);
        setTagError(null);
        try {
            const newTag = await onCreateTag({ name, color: newTagColor || null });
            // сразу выбираем его
            setSelectedTagIds(prev =>
                prev.length >= 10 ? prev : [...prev, newTag.id]
            );
            setNewTagName('');
            setNewTagColor('#4f46e5');
        } catch (err) {
            console.error('❌ Ошибка создания тега:', err);
            setTagError(err.message);
        } finally {
            setTagSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!title.trim()) return;

        const rangeError = validateDateRange(
            noStartDate ? null : startDate,
            noDueDate ? null : dueDate,
            projectDeadline
        );
        if (rangeError) {
            setLocalError(rangeError);
            return;
        }

        setSubmitting(true);
        try {
            await onCreate({
                title: title.trim(),
                description: description.trim() || null,
                columnId,
                priority,
                startDate: noStartDate || !startDate
                    ? null
                    : new Date(startDate).toISOString(),
                dueDate: noDueDate || !dueDate
                    ? null
                    : new Date(dueDate).toISOString(),
                tagIds: selectedTagIds
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>Создать задачу</h3>

                <form onSubmit={handleSubmit}>
                    <label>
                        Название *
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={255}
                            autoFocus
                            required
                        />
                    </label>

                    <label>
                        Описание
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                        />
                    </label>

                    <label>
                        Блок
                        <select value={columnId} onChange={e => setColumnId(e.target.value)}>
                            {columns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Приоритет
                        <select value={priority} onChange={e => setPriority(e.target.value)}>
                            {TASK_PRIORITIES.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.icon} {p.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {/* ── Дата начала ── */}
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={noStartDate}
                                onChange={e => {
                                    setNoStartDate(e.target.checked);
                                    if (e.target.checked) setStartDate('');
                                }}
                            />
                            Без даты начала
                        </label>

                        {!noStartDate && (
                            <label>
                                Дата начала
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    max={maxDate || undefined}
                                    onChange={e => setStartDate(e.target.value)}
                                    required
                                />
                            </label>
                        )}
                    </div>

                    {/* ── Дедлайн ── */}
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={noDueDate}
                                onChange={e => {
                                    setNoDueDate(e.target.checked);
                                    if (e.target.checked) setDueDate('');
                                }}
                            />
                            Без дедлайна (до конца проекта)
                        </label>

                        {!noDueDate && (
                            <label>
                                Дедлайн задачи
                                <input
                                    type="datetime-local"
                                    value={dueDate}
                                    max={maxDate || undefined}
                                    min={!noStartDate && startDate ? startDate : undefined}
                                    onChange={e => setDueDate(e.target.value)}
                                    required
                                />
                                {projectDeadline && (
                                    <small className="form-hint">
                                        Не позднее дедлайна проекта: {' '}
                                        {new Date(projectDeadline).toLocaleString('ru-RU')}
                                    </small>
                                )}
                            </label>
                        )}
                    </div>

                    {/* ── Теги ── */}
                    <div className="form-group">
                        <div className="tag-picker-header">
                            <span className="tag-picker-label">
                                Теги ({selectedTagIds.length}/10)
                            </span>
                            <button
                                type="button"
                                className="btn-toggle-tag-picker"
                                onClick={() => setShowTagPicker(v => !v)}
                            >
                                {showTagPicker ? 'Скрыть' : '🏷 Добавить теги'}
                            </button>
                        </div>

                        {/* Выбранные теги — чипы */}
                        {selectedTagIds.length > 0 && (
                            <div className="task-tags-list">
                                {selectedTagIds.map(id => {
                                    const tag = allTags.find(t => t.id === id);
                                    if (!tag) return null;
                                    return (
                                        <span
                                            key={id}
                                            className="task-tag-chip"
                                            style={{
                                                backgroundColor: tag.color ? `${tag.color}22` : '#eef2ff',
                                                color: tag.color || '#4f46e5',
                                                borderColor: tag.color || '#c7d2fe'
                                            }}
                                        >
                                            {tag.name}
                                            <button
                                                type="button"
                                                className="task-tag-remove"
                                                onClick={() => toggleTag(id)}
                                                title="Убрать тег"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* Раскрывающийся picker */}
                        {showTagPicker && (
                            <div className="tags-picker">
                                <div className="tags-picker-list">
                                    {allTags.length === 0 ? (
                                        <p className="no-tags-available">
                                            В проекте ещё нет тегов
                                        </p>
                                    ) : (
                                        allTags.map(t => {
                                            const checked = selectedTagIds.includes(t.id);
                                            const disabled =
                                                !checked && selectedTagIds.length >= 10;

                                            return (
                                                <label
                                                    key={t.id}
                                                    className={`tag-picker-item ${checked ? 'checked' : ''
                                                        } ${disabled ? 'disabled' : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => toggleTag(t.id)}
                                                    />
                                                    <span
                                                        className="tag-picker-dot"
                                                        style={{ backgroundColor: t.color || '#9ca3af' }}
                                                    />
                                                    <span className="tag-picker-name">
                                                        {t.name}
                                                    </span>
                                                    <span className="tag-picker-count">
                                                        {t.tasksCount} задач
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Создание нового тега */}
                                {onCreateTag && (
                                    <form
                                        className="tag-create-form"
                                        onSubmit={handleCreateTag}
                                    >
                                        <input
                                            type="color"
                                            value={newTagColor}
                                            onChange={e => setNewTagColor(e.target.value)}
                                            title="Цвет тега"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Новый тег…"
                                            value={newTagName}
                                            onChange={e => setNewTagName(e.target.value)}
                                            maxLength={50}
                                            disabled={tagSubmitting}
                                        />
                                        <button
                                            type="submit"
                                            disabled={tagSubmitting || !newTagName.trim()}
                                        >
                                            {tagSubmitting ? '…' : '+ Создать'}
                                        </button>
                                    </form>
                                )}

                                {tagError && (
                                    <div className="modal-error">{tagError}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {localError && (
                        <div className="modal-error">{localError}</div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={submitting}>
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={
                                submitting ||
                                !title.trim() ||
                                (!noStartDate && !startDate) ||
                                (!noDueDate && !dueDate)
                            }
                        >
                            {submitting ? 'Создание…' : 'Создать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}