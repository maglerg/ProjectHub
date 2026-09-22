// projecthub.client/src/components/tasks/ColumnEditorModal.js

import React, { useState, useEffect } from 'react';
import { createColumn, updateColumn } from '../../services/tasksApi';
import '../../styles/components/tasks/tasks.css';

export default function ColumnEditorModal({
    projectCode,
    column = null,
    onClose,
    onSaved,
}) {
    const isEdit = !!column;

    // ── Все хуки в начале ──
    const [name, setName] = useState(column?.name || '');
    const [progressWeight, setProgressWeight] = useState(
        column?.progressWeight ?? 0.5
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Сброс ошибки при изменении полей
    useEffect(() => {
        setError(null);
    }, [name, progressWeight]);

    // 🆕 Защита: если пришла системная колонка — закрываем
    useEffect(() => {
        if (column && (column.isDefault || column.systemKey)) {
            console.warn(
                'ColumnEditorModal: системная колонка, закрываем',
                column.name
            );
            if (onClose) onClose();
        }
    }, [column, onClose]);

    // ── Условный return — ТОЛЬКО после всех хуков ──
    if (column && (column.isDefault || column.systemKey)) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('Введите название колонки');
            return;
        }

        if (trimmedName.length > 100) {
            setError('Название не длиннее 100 символов');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = {
                name: trimmedName,
                progressWeight: Math.max(0, Math.min(1, progressWeight)),
            };

            let saved;
            if (isEdit) {
                saved = await updateColumn(projectCode, column.id, payload);
            } else {
                saved = await createColumn(projectCode, payload);
            }

            if (onSaved) onSaved(saved);
            onClose();
        } catch (err) {
            console.error('Ошибка сохранения колонки:', err);
            setError(err.message || 'Не удалось сохранить колонку');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content modal-content--column"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header-row">
                    <h3>{isEdit ? 'Редактировать колонку' : 'Новая колонка'}</h3>
                    <button
                        type="button"
                        className="modal-close-x"
                        onClick={onClose}
                        title="Закрыть"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="column-form">
                    {error && <div className="form-error">❌ {error}</div>}

                    <div className="form-group">
                        <label>Название *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например: Code Review"
                            maxLength={100}
                            autoFocus
                            disabled={saving}
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            Вес в прогрессе проекта
                            <span className="column-form__weight-value">
                                {Math.round(progressWeight * 100)}%
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={progressWeight}
                            onChange={(e) => setProgressWeight(parseFloat(e.target.value))}
                            disabled={saving}
                        />
                        <div className="column-form__weight-hint">
                            <span>0% — не выполнено</span>
                            <span>50% — в работе</span>
                            <span>100% — готово</span>
                        </div>
                        <div className="column-form__weight-tip">
                            💡 Вес влияет на общий прогресс проекта.
                            Задачи в этой колонке «вносят» этот процент
                            в итоговую цифру прогресса.
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                        >
                            {saving ? '⏳ Сохранение…' : '💾 Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}