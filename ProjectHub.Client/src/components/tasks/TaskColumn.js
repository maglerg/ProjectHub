// projecthub.client/src/components/tasks/TaskColumn.js

import React, { useState } from 'react';
import TaskCard from './TaskCard';

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

    return (
        <div
            className={`task-column ${isDragOver ? 'drag-over' : ''} ${isArchived ? 'task-column--archived' : ''}`}
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
                            🔒
                        </span>
                    )}
                    <span className="task-column-count">{tasksCount}</span>
                </div>

                {canManage && (
                    <div className="task-column-header-actions">
                        <button
                            type="button"
                            className="column-action-btn"
                            onClick={() => onEditColumn?.(column)}
                            title="Редактировать колонку"
                        >
                            ✏️
                        </button>
                        <button
                            type="button"
                            className="column-action-btn danger"
                            onClick={() => onDeleteColumn?.(column)}
                            title="Удалить колонку"
                        >
                            🗑
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