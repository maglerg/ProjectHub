// projecthub.client/src/components/tasks/TaskColumn.js

import React, { useState } from 'react';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import TaskCard from './TaskCard';

/**
 * Определяет тип колонки по её названию.
 * Возвращает один из: 'not-started' | 'in-progress' | 'done' | 'custom'.
 */
const getColumnType = (column) => {
    if (!column?.isDefault) return 'custom';

    const name = (column.name || '').toLowerCase().trim();

    // ── Завершено — проверяем ПЕРВЫМ, чтобы «выполнено» не попалось в другие ветки
    if (
        name.includes('заверш') ||
        name.includes('готов') ||
        name.includes('done') ||
        name.includes('complete') ||
        name.includes('выполнено')
    ) {
        return 'done';
    }

    // ── В процессе / В работе
    if (
        name.includes('процесс') ||
        name.includes('работ') ||
        name.includes('прогресс') ||
        name.includes('progress') ||
        name.includes('process') ||
        name.includes('doing') ||
        name.includes('in progress') ||
        name.includes('in-progress')
    ) {
        return 'in-progress';
    }

    // ── Не начато / Бэклог / To Do
    if (
        name.includes('не начат') ||
        name.includes('бэклог') ||
        name.includes('backlog') ||
        name.includes('todo') ||
        name.includes('to do') ||
        name.includes('to-do') ||
        name.includes('к выполнению') ||
        name.includes('сделать')
    ) {
        return 'not-started';
    }

    return 'custom';
};

export default function TaskColumn({
    column,
    columns,
    projectCode,
    currentUserEmail,
    isOwner,
    isArchived = false,
    onTake,
    onMove,
    onUpload,
    onRefresh,
    onError,
    onEditColumn,
    onDeleteColumn,
}) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        if (isArchived) return;
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        if (isArchived) return;
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        if (isArchived) return;
        e.preventDefault();
        setIsDragOver(false);

        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        const alreadyHere = column.tasks.some((t) => t.id === taskId);
        if (alreadyHere) return;

        onMove(taskId, column.id);
    };

    // 🆕 Можно ли управлять колонкой
    const canManage = isOwner && !isArchived && !column.isDefault;

    const tasksCount = column.tasks?.length ?? 0;
    const columnType = getColumnType(column);

    // Собираем классы динамически, чтобы не было пустых пробелов
    const columnClassName = [
        'task-column',
        `task-column--${columnType}`,
        isDragOver ? 'drag-over' : '',
        isArchived ? 'task-column--archived' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={columnClassName}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="task-column-header">
                <div className="task-column-header-left">
                    <span className="task-column-title">{column.name}</span>
                    {column.isDefault && (
                        <span
                            className="task-column-lock"
                            title="Системная колонка — нельзя переименовать или удалить"
                        >
                            <Lock size={12} />
                        </span>
                    )}
                    <span className="task-column-count">{tasksCount}</span>
                </div>

                {canManage && (
                    <div className="task-column-header-actions">
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={() => onEditColumn?.(column)}
                            title="Редактировать колонку"
                            aria-label="Редактировать колонку"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm column-action-btn--danger"
                            onClick={() => onDeleteColumn?.(column)}
                            title="Удалить колонку"
                            aria-label="Удалить колонку"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className="task-column-body">
                {column.tasks.length === 0 && (
                    <div className="task-column-empty">Нет задач</div>
                )}

                {column.tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        columns={columns}
                        projectCode={projectCode}
                        currentUserEmail={currentUserEmail}
                        isOwner={isOwner}
                        isArchived={isArchived}
                        onTake={onTake}
                        onUpload={onUpload}
                        onRefresh={onRefresh}
                        onError={onError}
                    />
                ))}
            </div>
        </div>
    );
}