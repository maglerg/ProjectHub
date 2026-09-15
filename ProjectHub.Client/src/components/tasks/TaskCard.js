import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function TaskCard({ task, currentUserEmail, isOwner, onTake }) {
    const navigate = useNavigate();
    const { code } = useParams();

    // Запоминаем, был ли drag — чтобы не открывать страницу после перетаскивания
    const draggedRef = useRef(false);

    const assignees = task.assignees || [];
    const isTaken = assignees.length > 0;
    const emailLower = (currentUserEmail || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const canDrag = isOwner || isMine;

    const handleDragStart = (e) => {
        if (!canDrag) {
            e.preventDefault();
            return;
        }
        draggedRef.current = true;
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        // Небольшая задержка, чтобы click не сработал сразу после drop
        setTimeout(() => {
            draggedRef.current = false;
        }, 0);
    };

    const handleClick = () => {
        if (draggedRef.current) return;
        navigate(`/projects/${code}/tasks/${task.id}`);
    };

    const handleTakeClick = (e) => {
        e.stopPropagation(); // не открываем страницу
        onTake(task.id);
    };

    return (
        <div
            className={`task-card ${canDrag ? 'draggable' : 'locked'}`}
            draggable={canDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            role="button"
            tabIndex={0}
        >
            <div className="task-card-header">
                <h4 className="task-card-title">{task.title}</h4>

                {!isTaken && (
                    <button
                        className="btn-take-task"
                        onClick={handleTakeClick}
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
                            className={`assignee-chip ${(a.email || '').toLowerCase() === emailLower ? 'me' : ''
                                }`}
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