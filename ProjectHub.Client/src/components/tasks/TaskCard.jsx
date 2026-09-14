import React from 'react';

export default function TaskCard({ task, currentUserEmail, isOwner, onTake }) {
    const assignees = task.assignees || [];
    const isTaken = assignees.length > 0;
    const isMine = assignees.some(a => a.email === currentUserEmail);
    const canDrag = isOwner || isMine;

    const handleDragStart = (e) => {
        if (!canDrag) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            className={`task-card ${canDrag ? 'draggable' : 'locked'}`}
            draggable={canDrag}
            onDragStart={handleDragStart}
        >
            <div className="task-card-header">
                <h4 className="task-card-title">{task.title}</h4>

                {/* Кнопка "Взять" только если задача свободна */}
                {!isTaken && (
                    <button
                        className="btn-take-task"
                        onClick={() => onTake(task.id)}
                        title="Взять задачу"
                    >
                        Взять
                    </button>
                )}
            </div>

            {task.description && (
                <p className="task-card-description">{task.description}</p>
            )}

            {isTaken && (
                <div className="task-card-assignees">
                    {assignees.map(a => (
                        <span
                            key={a.email}
                            className={`assignee-chip ${a.email === currentUserEmail ? 'me' : ''}`}
                            title={a.email}
                        >
                            {a.name || a.email}
                        </span>
                    ))}
                </div>
            )}

            <div className="task-card-footer">
                <span className="task-card-author">
                    от {task.createdByName || task.createdByEmail}
                </span>
            </div>
        </div>
    );
}