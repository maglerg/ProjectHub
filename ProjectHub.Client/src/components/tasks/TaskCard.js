// components/tasks/TaskCard.jsx
import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getTaskById,
    updateTask,
    takeTask,
    leaveTask,
    moveTask,
    deleteTask
} from '../../services/tasksApi';
import { getPriorityInfo, getPriorityColor } from '../../utils/constants';
import TaskContextMenu from './TaskContextMenu';

export default function TaskCard({
    task,
    columns,
    projectCode,
    currentUserEmail,
    isOwner,
    onTake,
    onUpload,
    onRefresh,
    onError
}) {
    const navigate = useNavigate();
    const { code } = useParams();
    const draggedRef = useRef(false);
    const fileInputRef = useRef(null);

    const [expanded, setExpanded] = useState(false);
    const [subtasks, setSubtasks] = useState(null);
    const [loadingSubtasks, setLoadingSubtasks] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // ── Контекстное меню ──
    const [contextMenu, setContextMenu] = useState(null); // { x, y }

    const assignees = task.assignees || [];
    const isTaken = assignees.length > 0;
    const emailLower = (currentUserEmail || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const canDrag = isOwner || isMine;
    const canUpload = !!task.canUploadAttachments;

    const hasSubtasks = task.hasSubtasks && task.totalSubtasksCount > 0;

    const priorityInfo = getPriorityInfo(task.priority);
    const priorityColor = getPriorityColor(task.priority);

    // ── Drag-n-drop ──
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
        e.target.value = '';
        await onUpload(task.id, file);
    };

    const handleToggleExpand = async (e) => {
        e.stopPropagation();
        const next = !expanded;
        setExpanded(next);

        if (next && subtasks === null) {
            setLoadingSubtasks(true);
            setLoadError(null);
            try {
                const full = await getTaskById(code, task.id);
                setSubtasks(full.subtasks || []);
            } catch (err) {
                console.error('❌ Ошибка загрузки подзадач:', err);
                setLoadError(err.message);
            } finally {
                setLoadingSubtasks(false);
            }
        }
    };

    // ── Правый клик — открыть контекстное меню ──
    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // ── Действия контекстного меню ──
    const handleOpenFromMenu = () => {
        navigate(`/projects/${code}/tasks/${task.id}`);
    };

    const handleEditFromMenu = () => {
        navigate(`/projects/${code}/tasks/${task.id}?edit=1`);
    };

    const handleTakeFromMenu = async () => {
        try {
            await takeTask(projectCode, task.id);
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка взятия задачи:', err);
            onError?.(err.message);
        }
    };

    const handleLeaveFromMenu = async () => {
        if (!window.confirm('Снять себя с задачи?')) return;
        try {
            await leaveTask(projectCode, task.id);
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка снятия с задачи:', err);
            onError?.(err.message);
        }
    };

    const handleMoveFromMenu = async (columnId) => {
        try {
            await moveTask(projectCode, task.id, columnId);
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка перемещения задачи:', err);
            onError?.(err.message);
            onRefresh?.();
        }
    };

    const handlePriorityFromMenu = async (priority) => {
        try {
            await updateTask(projectCode, task.id, {
                title: task.title,
                description: task.description,
                columnId: task.columnId,
                priority,
                dueDate: task.dueDate || null
            });
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка смены приоритета:', err);
            onError?.(err.message);
        }
    };

    const handleDeleteFromMenu = async () => {
        if (!window.confirm(`Удалить задачу "${task.title}"?`)) return;
        try {
            await deleteTask(projectCode, task.id);
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка удаления задачи:', err);
            onError?.(err.message);
        }
    };

    return (
        <>
            <div
                className={`task-card ${canDrag ? 'draggable' : 'locked'}`}
                draggable={canDrag}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                style={{ borderLeftColor: priorityColor }}
            >
                <div className="task-card-header">
                    <h4 className="task-card-title">
                        {task.priority && task.priority !== 'None' && (
                            <span
                                className="task-priority-icon"
                                title={priorityInfo.label}
                                style={{ color: priorityInfo.color }}
                            >
                                {priorityInfo.icon}
                            </span>
                        )}
                        {task.title}
                    </h4>
                </div>

                {hasSubtasks && (
                    <button
                        type="button"
                        className={`btn-expand-subtasks ${expanded ? 'expanded' : ''}`}
                        onClick={handleToggleExpand}
                        title={expanded ? 'Свернуть подзадачи' : 'Показать подзадачи'}
                    >
                        <span className="triangle">▼</span>
                        <span className="subtask-counter">
                            {task.completedSubtasksCount}/{task.totalSubtasksCount}
                        </span>
                    </button>
                )}

                {task.description && (
                    <p className="task-card-description">{task.description}</p>
                )}

                {hasSubtasks && (
                    <div className="task-card-subtasks">
                        <div className="subtask-mini-bar">
                            <div
                                className="subtask-mini-bar-fill"
                                style={{
                                    width: `${(task.completedSubtasksCount / task.totalSubtasksCount) * 100}%`
                                }}
                            />
                        </div>
                    </div>
                )}

                {expanded && (
                    <div
                        className="task-card-subtasks-expanded"
                        onClick={e => e.stopPropagation()}
                    >
                        {loadingSubtasks && (
                            <div className="subtasks-loading">Загрузка…</div>
                        )}

                        {loadError && (
                            <div className="subtasks-load-error">
                                Ошибка: {loadError}
                            </div>
                        )}

                        {!loadingSubtasks && !loadError && subtasks?.length === 0 && (
                            <div className="subtasks-empty">Подзадач нет</div>
                        )}

                        {!loadingSubtasks && !loadError && subtasks?.length > 0 && (
                            <ul className="subtasks-preview-list">
                                {subtasks.map(s => (
                                    <li
                                        key={s.id}
                                        className={`subtasks-preview-item ${s.isCompleted ? 'completed' : ''}`}
                                    >
                                        <span className="subtask-check">
                                            {s.isCompleted ? '☑' : '☐'}
                                        </span>
                                        <span className="subtask-preview-title">
                                            {s.title}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
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
                        {task.attachmentsCount > 0 && (
                            <span
                                className="task-card-attachments-badge"
                                title={`Вложений: ${task.attachmentsCount}`}
                            >
                                📎 {task.attachmentsCount}
                            </span>
                        )}

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

            {contextMenu && (
                <TaskContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    task={task}
                    columns={columns}
                    currentUserEmail={currentUserEmail}
                    isOwner={isOwner}
                    projectCode={projectCode}
                    onClose={() => setContextMenu(null)}
                    onOpen={handleOpenFromMenu}
                    onEdit={handleEditFromMenu}
                    onTake={handleTakeFromMenu}
                    onLeave={handleLeaveFromMenu}
                    onMove={handleMoveFromMenu}
                    onPriority={handlePriorityFromMenu}
                    onDelete={handleDeleteFromMenu}
                />
            )}
        </>
    );
}