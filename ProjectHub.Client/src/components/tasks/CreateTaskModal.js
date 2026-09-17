import React, { useState } from 'react';
import { TASK_PRIORITIES } from '../../utils/constants';
import { toLocalInputValue, validateDateRange } from '../../utils/datetime';

export default function CreateTaskModal({
    columns, projectDeadline, onClose, onCreate
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

    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState(null);

    const projectDeadlineDate = projectDeadline ? new Date(projectDeadline) : null;
    const maxDate =
        projectDeadlineDate && projectDeadlineDate > new Date()
            ? toLocalInputValue(projectDeadlineDate)
            : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!title.trim()) return;

        // Проверки дат
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
                    : new Date(dueDate).toISOString()
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
                            Без дедлайна
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