// components/tasks/TaskCard.jsx

import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paperclip,
    ChevronDown,
    ChevronRight,
    CheckSquare,
    Square,
    Clock,
    Flag,
} from 'lucide-react';
import {
    getTaskById,
    updateTask,
    takeTask,
    leaveTask,
    moveTask,
    deleteTask
} from '../../services/tasksApi';
import { getPriorityInfo, getPriorityColor } from '../../utils/constants';
import { formatDateTime, getDeadlineStatus } from '../../utils/datetime';
import TaskContextMenu from './TaskContextMenu';
import '../../styles/components/tasks/tasks.css';

export default function TaskCard({
    task,
    columns,
    projectCode,
    currentUserEmail,
    isOwner,
    isArchived = false,
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
    const [contextMenu, setContextMenu] = useState(null);

    const assignees = task.assignees || [];
    const tags = task.tags || [];
    const isTaken = assignees.length > 0;
    const emailLower = (currentUserEmail || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );

    // В архиве нельзя перетаскивать и прикреплять файлы
    const canDrag = !isArchived && (isOwner || isMine);
    const canUpload = !isArchived && !!task.canUploadAttachments;

    const hasSubtasks = task.hasSubtasks && task.totalSubtasksCount > 0;

    const priorityInfo = getPriorityInfo(task.priority);
    const priorityColor = getPriorityColor(task.priority);
    const PriorityIcon = priorityInfo.lucideIcon;

    // ── Эффективный дедлайн ──
    const effectiveDue = task.effectiveDueDate;
    const isDueFixed = !!task.isDueDateFixed;
    const deadlineStatus = getDeadlineStatus(effectiveDue, !!task.completedAt);

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
        if (isArchived) return;
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

    // ── Правый клик ──
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
        if (isArchived) return;
        navigate(`/projects/${code}/tasks/${task.id}?edit=1`);
    };

    const handleTakeFromMenu = async () => {
        if (isArchived) return;
        try {
            await takeTask(projectCode, task.id);
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка взятия задачи:', err);
            onError?.(err.message);
        }
    };

    const handleLeaveFromMenu = async () => {
        if (isArchived) return;
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
        if (isArchived) return;
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
        if (isArchived) return;
        try {
            await updateTask(projectCode, task.id, {
                title: task.title,
                description: task.description,
                columnId: task.columnId,
                priority,
                startDate: task.startDate || null,
                dueDate: task.dueDate || null
            });
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка смены приоритета:', err);
            onError?.(err.message);
        }
    };

    const handleDeleteFromMenu = async () => {
        if (isArchived) return;
        if (!window.confirm(`Удалить задачу "${task.title}"?`)) return;
        try {
            await deleteTask(projectCode, task.id);
            onRefresh?.();
        } catch (err) {
            console.error('❌ Ошибка удаления задачи:', err);
            onError?.(err.message);
        }
    };

    // ── Классы корневого элемента ──
    const cardClassName = [
        'task-card',
        canDrag ? 'task-card--draggable' : 'task-card--locked',
        isArchived ? 'task-card--archived' : '',
        isMine ? 'task-card--mine' : '',
    ].filter(Boolean).join(' ');

    return (
        <>
            <div
                className={cardClassName}
                draggable={canDrag}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                style={{ borderLeftColor: priorityColor }}
            >
                {/* ── Заголовок ── */}
                <div className="task-card-header">
                    <h4 className="task-card-title">
                        {task.priority && task.priority !== 'None' && PriorityIcon && (
                            <span
                                className="task-priority-icon"
                                title={priorityInfo.label}
                                style={{ color: priorityInfo.color }}
                            >
                                <PriorityIcon size={14} />
                            </span>
                        )}
                        {task.title}
                    </h4>

                    {hasSubtasks && (
                        <button
                            type="button"
                            className={`btn btn--ghost btn--sm btn-expand-subtasks ${expanded ? 'expanded' : ''}`}
                            onClick={handleToggleExpand}
                            title={expanded ? 'Свернуть подзадачи' : 'Показать подзадачи'}
                            aria-expanded={expanded}
                        >
                            {expanded ? (
                                <ChevronDown size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                            <span className="subtask-counter">
                                {task.completedSubtasksCount}/{task.totalSubtasksCount}
                            </span>
                        </button>
                    )}
                </div>

                {/* ── Описание ── */}
                {task.description && (
                    <p className="task-card-description">{task.description}</p>
                )}

                {/* ── Мини-прогресс подзадач ── */}
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

                {/* ── Раскрытые подзадачи ── */}
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
                                            {s.isCompleted ? (
                                                <CheckSquare size={14} />
                                            ) : (
                                                <Square size={14} />
                                            )}
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

                {/* ── Теги ── */}
                {tags.length > 0 && (
                    <div className="task-card-tags">
                        {tags.slice(0, 5).map(t => (
                            <span
                                key={t.id}
                                className="task-card-tag"
                                style={{
                                    backgroundColor: t.color ? `${t.color}22` : '#eef2ff',
                                    color: t.color || '#4f46e5',
                                    borderColor: t.color || '#c7d2fe'
                                }}
                                title={t.name}
                            >
                                {t.name}
                            </span>
                        ))}
                        {tags.length > 5 && (
                            <span
                                className="task-card-tag-more"
                                title={tags.slice(5).map(t => t.name).join(', ')}
                            >
                                +{tags.length - 5}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Исполнители ── */}
                {isTaken && (
                    <div className="task-card-assignees">
                        {assignees.map(a => (
                            <span
                                key={a.email}
                                className={`assignee-chip ${(a.email || '').toLowerCase() === emailLower ? 'assignee-chip--me' : ''}`}
                                title={a.email}
                            >
                                {a.name || a.email}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── Футер: автор + действия ── */}
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
                                <Paperclip size={12} />
                                {task.attachmentsCount}
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
                                    type="button"
                                    className="btn btn--ghost btn--icon btn--sm"
                                    title="Прикрепить файл"
                                    onClick={handleUploadClick}
                                    aria-label="Прикрепить файл"
                                >
                                    <Paperclip size={14} />
                                </button>
                            </>
                        )}

                        {/* ── Эффективный дедлайн ── */}
                        {effectiveDue && (
                            <span
                                className={`task-card-deadline task-card-deadline--${deadlineStatus}`}
                                title={
                                    isDueFixed
                                        ? `Дедлайн: ${formatDateTime(effectiveDue)}`
                                        : `Дедлайн по проекту: ${formatDateTime(effectiveDue)}`
                                }
                            >
                                {isDueFixed ? (
                                    <Clock size={12} />
                                ) : (
                                    <Flag size={12} />
                                )}
                                {' '}
                                {new Date(effectiveDue).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit'
                                })}
                            </span>
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
                    isArchived={isArchived}
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