import React, { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function TaskCard({
    task, projectCode, currentUserEmail, isOwner, onTake, onUpload
}) {
    const navigate = useNavigate();
    const { code } = useParams();
    const draggedRef = useRef(false);
    const fileInputRef = useRef(null);

    const assignees = task.assignees || [];
    const isTaken = assignees.length > 0;
    const emailLower = (currentUserEmail || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const canDrag = isOwner || isMine;
    const canUpload = !!task.canUploadAttachments;

    const handleDragStart = (e) => {
        if (!canDrag) { e.preventDefault(); return; }
        draggedRef.current = true;
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setTimeout(() => { draggedRef.current = false; }, 0);
    };

    const handleClick = () => {
        if (draggedRef.current) return;
        navigate(`/projects/${code}/tasks/${task.id}`);
    };

    const handleTakeClick = (e) => {
        e.stopPropagation();
        onTake(task.id);
    };

    const handleUploadClick = (e) => {
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ''; // сбрасываем, чтобы можно было выбрать тот же файл
        await onUpload(task.id, file);
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

                <div className="task-card-actions">
                    {/* Бейдж "есть вложения" */}
                    {task.attachmentsCount > 0 && (
                        <span
                            className="task-card-attachments-badge"
                            title={`Вложений: ${task.attachmentsCount}`}
                        >
                            📎 {task.attachmentsCount}
                        </span>
                    )}

                    {/* Кнопка прикрепить — только owner/assignee */}
                    {canUpload && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                onClick={e => e.stopPropagation()}
                            />
                            <button
                                className="btn-card-attach"
                                title="Прикрепить файл"
                                onClick={handleUploadClick}
                            >
                                📎
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}