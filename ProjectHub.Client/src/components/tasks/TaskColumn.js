import React, { useState } from 'react';
import TaskCard from './TaskCard';

export default function TaskColumn({ column, projectCode, currentUserEmail, isOwner, onTake, onMove, onUpload }) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        // Игнорируем, если ушли не за пределы колонки
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        // Если задача уже в этой колонке — ничего не делаем
        const alreadyHere = column.tasks.some(t => t.id === taskId);
        if (alreadyHere) return;

        onMove(taskId, column.id);
    };

    return (
        <div
            className={`task-column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="task-column-header">
                <span className="task-column-title">{column.name}</span>
                <span className="task-column-count">{column.tasks.length}</span>
            </div>

            <div className="task-column-body">
                {column.tasks.length === 0 && (
                    <div className="task-column-empty">Нет задач</div>
                )}

                {column.tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        projectCode={projectCode}
                        currentUserEmail={currentUserEmail}
                        isOwner={isOwner}
                        onTake={onTake}
                        onUpload={onUpload}
                    />
                ))}
            </div>
        </div>
    );
}