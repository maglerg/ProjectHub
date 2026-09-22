// projecthub.client/src/components/tasks/DeleteColumnModal.js

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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
                    <h3 className="modal-title">
                        Удалить колонку «{column.name}»?
                    </h3>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={onClose}
                        title="Закрыть"
                        aria-label="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="delete-column__body">
                    {error && (
                        <div className="form-error">
                            <X size={14} />
                            {error}
                        </div>
                    )}

                    {hasTasks ? (
                        <>
                            <p className="delete-column__warning">
                                <AlertTriangle size={16} />
                                В колонке <b>{tasksCount}</b> задач(и).
                                Их нужно перенести в другую колонку.
                            </p>

                            <div className="form-group">
                                <label className="form-label" htmlFor="target-column">
                                    Перенести задачи в <span className="form-required">*</span>
                                </label>
                                <select
                                    id="target-column"
                                    className="input"
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
                        <p className="delete-column__warning delete-column__warning--info">
                            В колонке нет задач. Удалить?
                        </p>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        className="btn btn--danger"
                        onClick={handleSubmit}
                        disabled={deleting || (hasTasks && !targetColumnId)}
                    >
                        {deleting ? (
                            <>
                                <Loader2 size={16} className="icon-spin" />
                                Удаление…
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} />
                                Удалить колонку
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}