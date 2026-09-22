// projecthub.client/src/components/tasks/DeleteColumnModal.js

import React, { useState } from 'react';
import { deleteColumn } from '../../services/tasksApi';
import '../../styles/components/tasks/tasks.css';

/**
 * Модалка удаления кастомной колонки.
 *   • если в колонке нет задач — простое подтверждение;
 *   • если есть — обязательный выбор целевой колонки для переноса.
 */
export default function DeleteColumnModal({
    projectCode,
    column,
    allColumns = [],
    onClose,
    onDeleted,
}) {
    const [targetColumnId, setTargetColumnId] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    const tasksCount = column?.tasksCount ?? column?.tasks?.length ?? 0;
    const hasTasks = tasksCount > 0;

    const availableTargets = allColumns.filter((c) => c.id !== column.id);

    const handleSubmit = async () => {
        if (deleting) return;

        if (hasTasks && !targetColumnId) {
            setError('Выберите колонку, куда перенести задачи');
            return;
        }

        setDeleting(true);
        setError(null);

        try {
            await deleteColumn(
                projectCode,
                column.id,
                hasTasks ? targetColumnId : null
            );
            if (onDeleted) onDeleted(column.id);
            onClose();
        } catch (err) {
            console.error('Ошибка удаления колонки:', err);
            setError(err.message || 'Не удалось удалить колонку');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content modal-content--column"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header-row">
                    <h3>Удалить колонку «{column.name}»?</h3>
                    <button
                        type="button"
                        className="modal-close-x"
                        onClick={onClose}
                        title="Закрыть"
                    >
                        ✕
                    </button>
                </div>

                {error && <div className="form-error">❌ {error}</div>}

                {hasTasks ? (
                    <>
                        <p className="delete-column__warning">
                            ⚠️ В колонке <b>{tasksCount}</b> задач(и).
                            Их нужно перенести в другую колонку.
                        </p>

                        <div className="form-group">
                            <label>Перенести задачи в *</label>
                            <select
                                value={targetColumnId}
                                onChange={(e) => setTargetColumnId(e.target.value)}
                                disabled={deleting}
                            >
                                <option value="">— Выберите колонку —</option>
                                {availableTargets.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                ) : (
                    <p className="delete-column__warning">
                        В колонке нет задач. Удалить?
                    </p>
                )}

                <div className="modal-actions">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="btn-danger"
                        onClick={handleSubmit}
                        disabled={deleting || (hasTasks && !targetColumnId)}
                    >
                        {deleting ? '⏳ Удаление…' : '🗑 Удалить колонку'}
                    </button>
                </div>
            </div>
        </div>
    );
}