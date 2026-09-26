// projecthub.client/src/components/tasks/TasksBoard.js

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Plus, Archive, X, AlertTriangle,
    Columns3, Rows3,
} from 'lucide-react';
import {
    getTasksBoard,
    takeTask,
    createTask,
    moveTask,
    uploadTaskAttachment,
    getProjectProgress,
    getProjectTags,
    createTag,
    setTaskTags,
} from '../../services/tasksApi';
import { signalr } from '../../services/signalrService';
import TaskColumn from './TaskColumn';
import CreateTaskModal from './CreateTaskModal';
import ColumnEditorModal from './ColumnEditorModal';
import DeleteColumnModal from './DeleteColumnModal';
import '../../styles/components/tasks/tasks.css';

export default function TasksBoard({
    projectCode,
    projectDeadline,
    currentUserEmail,
    isOwner,
    filters = {},
    isArchived = false,
}) {
    const {
        onlyMyTasks = false,
        priorityFilter = 'All',
        onlyActive = false,
        hideCompleted = false,
        tagFilters = [],
    } = filters;

    const [columns, setColumns] = useState([]);
    const [progress, setProgress] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionError, setActionError] = useState(null);

    // 🆕 Раскладка колонок
    const [layout, setLayout] = useState('vertical');

    // 🆕 Состояние для управления колонками
    const [isCreatingColumn, setIsCreatingColumn] = useState(false);
    const [editingColumn, setEditingColumn] = useState(null);
    const [deletingColumn, setDeletingColumn] = useState(null);

    // 🆕 Ref — чтобы обработчики SignalR видели актуальные значения
    const projectCodeRef = useRef(projectCode);
    useEffect(() => { projectCodeRef.current = projectCode; }, [projectCode]);

    // 🆕 Загрузка доски и прогресса
    const loadBoard = useCallback(async (silent = false) => {
        if (!projectCode) return;
        try {
            if (!silent) {
                setLoading(true);
                setError(null);
            }
            const [boardData, progressData] = await Promise.all([
                getTasksBoard(projectCode),
                getProjectProgress(projectCode),
            ]);
            setColumns(boardData);
            setProgress(progressData);
        } catch (e) {
            console.error('❌ Ошибка загрузки задач:', e);
            if (!silent) setError(e.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [projectCode]);

    // 🆕 Тихая перезагрузка прогресса (после событий SignalR)
    const refreshProgress = useCallback(async () => {
        if (!projectCodeRef.current) return;
        try {
            const progressData = await getProjectProgress(projectCodeRef.current);
            setProgress(progressData);
        } catch (e) {
            console.warn('Не удалось обновить прогресс:', e);
        }
    }, []);

    // ── Загрузка тегов проекта ──
    const loadTags = useCallback(async () => {
        if (!projectCode) return;
        try {
            const tags = await getProjectTags(projectCode);
            setAllTags(tags);
        } catch (e) {
            console.warn('Не удалось загрузить теги проекта:', e);
        }
    }, [projectCode]);

    // ── Первичная загрузка ──
    useEffect(() => {
        if (projectCode) {
            loadBoard();
            loadTags();
        }
    }, [projectCode, loadBoard, loadTags]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: только подписки на события.
    //     JoinProject/LeaveProject делает ProjectDashboardPage.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!projectCode) return;

        // ── Хелпер: удалить задачу из всех колонок ──
        const removeTaskFromColumns = (cols, taskId) =>
            cols.map((c) => ({
                ...c,
                tasks: c.tasks.filter((t) => t.id !== taskId),
            }));

        // ── Хелпер: положить задачу в нужную колонку ──
        const upsertTaskInColumns = (cols, task, targetColumnId) => {
            const taskColumnId = targetColumnId || task.columnId;

            const without = removeTaskFromColumns(cols, task.id);

            return without.map((c) => {
                if (c.id !== taskColumnId) return c;
                if (c.tasks.some((t) => t.id === task.id)) return c;
                return {
                    ...c,
                    tasks: [...c.tasks, task],
                };
            });
        };

        // ── TaskCreated ──
        const handleTaskCreated = (task) => {
            if (!task?.id) return;
            setColumns((prev) =>
                upsertTaskInColumns(prev, task, task.columnId)
            );
            refreshProgress();
        };

        // ── TaskUpdated ──
        const handleTaskUpdated = (task) => {
            if (!task?.id) return;
            setColumns((prev) =>
                upsertTaskInColumns(prev, task, task.columnId)
            );
            refreshProgress();
        };

        // ── TaskMoved ──
        const handleTaskMoved = (payload) => {
            const task = payload?.task;
            if (!task?.id) return;
            setColumns((prev) =>
                upsertTaskInColumns(prev, task, payload.newColumnId || task.columnId)
            );
            refreshProgress();
        };

        // ── TaskDeleted ──
        const handleTaskDeleted = (payload) => {
            const taskId = payload?.taskId;
            if (!taskId) return;
            setColumns((prev) => removeTaskFromColumns(prev, taskId));
            refreshProgress();
        };

        // ── TaskTaken / TaskLeft ──
        const handleTaskTakenOrLeft = (task) => {
            if (!task?.id) return;
            setColumns((prev) =>
                upsertTaskInColumns(prev, task, task.columnId)
            );
        };

        // ── AttachmentAdded / AttachmentDeleted ──
        const handleAttachmentAdded = (payload) => {
            const { taskId, attachment } = payload || {};
            if (!taskId) return;

            setColumns((prev) =>
                prev.map((c) => ({
                    ...c,
                    tasks: c.tasks.map((t) => {
                        if (t.id !== taskId) return t;
                        return {
                            ...t,
                            attachmentsCount: (t.attachmentsCount || 0) + 1,
                            attachments: [...(t.attachments || []), attachment],
                        };
                    }),
                }))
            );
        };

        const handleAttachmentDeleted = (payload) => {
            const { taskId, attachmentId } = payload || {};
            if (!taskId) return;

            setColumns((prev) =>
                prev.map((c) => ({
                    ...c,
                    tasks: c.tasks.map((t) => {
                        if (t.id !== taskId) return t;
                        return {
                            ...t,
                            attachmentsCount: Math.max(0, (t.attachmentsCount || 1) - 1),
                            attachments: (t.attachments || []).filter(
                                (a) => a.id !== attachmentId
                            ),
                        };
                    }),
                }))
            );
        };

        // ── Subtask* ──
        const handleSubtaskChanged = (payload) => {
            const task = payload?.task;
            if (task?.id) {
                setColumns((prev) =>
                    upsertTaskInColumns(prev, task, task.columnId)
                );
                refreshProgress();
                return;
            }

            const { taskId, subtask } = payload || {};
            if (!taskId || !subtask) return;

            setColumns((prev) =>
                prev.map((c) => ({
                    ...c,
                    tasks: c.tasks.map((t) => {
                        if (t.id !== taskId) return t;
                        const subtasks = (t.subtasks || []).map((s) =>
                            s.id === subtask.id ? subtask : s
                        );
                        return {
                            ...t,
                            subtasks,
                            totalSubtasksCount: subtasks.length,
                            completedSubtasksCount: subtasks.filter((s) => s.isCompleted).length,
                            hasSubtasks: subtasks.length > 0,
                        };
                    }),
                }))
            );
        };

        // ── Теги задачи ──
        const handleTaskTagsUpdated = (task) => {
            if (!task?.id) return;
            setColumns((prev) =>
                upsertTaskInColumns(prev, task, task.columnId)
            );
        };

        // ── Теги проекта ──
        const handleTaskTagCreated = (tag) => {
            if (!tag?.id) return;
            setAllTags((prev) => {
                if (prev.some((t) => t.id === tag.id)) return prev;
                return [...prev, tag].sort((a, b) => a.name.localeCompare(b.name));
            });
        };

        const handleTaskTagDeleted = (payload) => {
            const tagId = payload?.tagId;
            if (!tagId) return;
            setAllTags((prev) => prev.filter((t) => t.id !== tagId));
            setColumns((prev) =>
                prev.map((c) => ({
                    ...c,
                    tasks: c.tasks.map((t) => ({
                        ...t,
                        tags: (t.tags || []).filter((tag) => tag.id !== tagId),
                    })),
                }))
            );
        };

        // ── Колонки ──
        const handleColumnCreated = (column) => {
            if (!column?.id) return;
            setColumns((prev) => {
                if (prev.some((c) => c.id === column.id)) return prev;
                return [...prev, column].sort((a, b) => a.order - b.order);
            });
        };

        const handleColumnUpdated = (column) => {
            if (!column?.id) return;
            setColumns((prev) =>
                prev.map((c) =>
                    c.id === column.id
                        ? { ...c, ...column, tasks: c.tasks }
                        : c
                )
            );
        };

        const handleColumnDeleted = (payload) => {
            const columnId = payload?.columnId;
            const moveToColumnId = payload?.moveToColumnId;
            if (!columnId) return;

            setColumns((prev) => {
                const removed = prev.find((c) => c.id === columnId);
                const without = prev.filter((c) => c.id !== columnId);

                if (!removed || !moveToColumnId) return without;

                return without.map((c) =>
                    c.id === moveToColumnId
                        ? {
                            ...c,
                            tasks: [...c.tasks, ...removed.tasks.map((t) => ({
                                ...t,
                                columnId: moveToColumnId,
                            }))],
                        }
                        : c
                );
            });
            refreshProgress();
        };

        // ── ColumnsReordered ──
        const handleColumnsReordered = (lightBoard) => {
            if (!Array.isArray(lightBoard)) return;
            setColumns((prev) => {
                const byId = new Map(prev.map((c) => [c.id, c]));
                const result = lightBoard.map((lc) => {
                    const existing = byId.get(lc.id);
                    if (existing) {
                        return {
                            ...existing,
                            name: lc.name,
                            order: lc.order,
                            systemKey: lc.systemKey,
                            isDefault: lc.isDefault,
                            progressWeight: lc.progressWeight,
                            tasksCount: lc.tasksCount,
                        };
                    }
                    return {
                        id: lc.id,
                        name: lc.name,
                        order: lc.order,
                        systemKey: lc.systemKey,
                        isDefault: lc.isDefault,
                        progressWeight: lc.progressWeight,
                        tasksCount: lc.tasksCount,
                        tasks: [],
                    };
                });
                return result.sort((a, b) => a.order - b.order);
            });
        };

        // ── Reconnect — перезагружаем доску целиком ──
        //    JoinProject делает ProjectDashboardPage при своём reconnect.
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing board…');
            loadBoard(true);
            loadTags();
        };

        // Регистрация
        signalr.on('TaskCreated', handleTaskCreated);
        signalr.on('TaskUpdated', handleTaskUpdated);
        signalr.on('TaskMoved', handleTaskMoved);
        signalr.on('TaskDeleted', handleTaskDeleted);
        signalr.on('TaskTaken', handleTaskTakenOrLeft);
        signalr.on('TaskLeft', handleTaskTakenOrLeft);
        signalr.on('AttachmentAdded', handleAttachmentAdded);
        signalr.on('AttachmentDeleted', handleAttachmentDeleted);
        signalr.on('SubtaskAdded', handleSubtaskChanged);
        signalr.on('SubtaskUpdated', handleSubtaskChanged);
        signalr.on('SubtaskDeleted', handleSubtaskChanged);
        signalr.on('TaskTagsUpdated', handleTaskTagsUpdated);
        signalr.on('TaskTagCreated', handleTaskTagCreated);
        signalr.on('TaskTagDeleted', handleTaskTagDeleted);
        signalr.on('ColumnCreated', handleColumnCreated);
        signalr.on('ColumnUpdated', handleColumnUpdated);
        signalr.on('ColumnDeleted', handleColumnDeleted);
        signalr.on('ColumnsReordered', handleColumnsReordered);
        signalr.on('_reconnected', handleReconnected);

        // Ленивый connect — на случай если родитель ещё не успел
        signalr.connect().catch((err) => {
            console.warn('SignalR connect from TasksBoard failed:', err);
        });

        return () => {
            signalr.off('TaskCreated', handleTaskCreated);
            signalr.off('TaskUpdated', handleTaskUpdated);
            signalr.off('TaskMoved', handleTaskMoved);
            signalr.off('TaskDeleted', handleTaskDeleted);
            signalr.off('TaskTaken', handleTaskTakenOrLeft);
            signalr.off('TaskLeft', handleTaskTakenOrLeft);
            signalr.off('AttachmentAdded', handleAttachmentAdded);
            signalr.off('AttachmentDeleted', handleAttachmentDeleted);
            signalr.off('SubtaskAdded', handleSubtaskChanged);
            signalr.off('SubtaskUpdated', handleSubtaskChanged);
            signalr.off('SubtaskDeleted', handleSubtaskChanged);
            signalr.off('TaskTagsUpdated', handleTaskTagsUpdated);
            signalr.off('TaskTagCreated', handleTaskTagCreated);
            signalr.off('TaskTagDeleted', handleTaskTagDeleted);
            signalr.off('ColumnCreated', handleColumnCreated);
            signalr.off('ColumnUpdated', handleColumnUpdated);
            signalr.off('ColumnDeleted', handleColumnDeleted);
            signalr.off('ColumnsReordered', handleColumnsReordered);
            signalr.off('_reconnected', handleReconnected);

            // LeaveProject НЕ вызываем — это делает ProjectDashboardPage
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectCode, loadBoard, loadTags, refreshProgress]);

    // ── Проверка: задача "активная"? ──
    const isTaskActive = (t) => {
        if (t.completedAt) return true;
        if ((t.assignees || []).length > 0) return true;
        if (t.startDate) {
            const start = new Date(t.startDate);
            const now = new Date();
            if (start <= now) return true;
        }
        return false;
    };

    // ── Фильтрация ──
    const filterColumns = (cols) => {
        const emailLower = (currentUserEmail || '').toLowerCase();
        const useMy = onlyMyTasks;
        const usePriority = priorityFilter !== 'All';
        const useActive = onlyActive;
        const useHideCompleted = hideCompleted;
        const useTags = tagFilters.length > 0;

        if (!useMy && !usePriority && !useActive && !useHideCompleted && !useTags)
            return cols;

        return cols.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => {
                if (useMy) {
                    const isMine = (t.assignees || []).some(
                        (a) => (a.email || '').toLowerCase() === emailLower
                    );
                    if (!isMine) return false;
                }
                if (usePriority && t.priority !== priorityFilter) return false;
                if (useActive && !isTaskActive(t)) return false;
                if (useHideCompleted && t.completedAt) return false;

                if (useTags) {
                    const taskTagIds = (t.tags || []).map((tag) => tag.id);
                    const hasAll = tagFilters.every((id) => taskTagIds.includes(id));
                    if (!hasAll) return false;
                }

                return true;
            }),
        }));
    };

    const visibleColumns = filterColumns(columns);

    // ── Взять задачу ──
    const handleTake = async (taskId) => {
        if (isArchived) return;
        try {
            setActionError(null);
            const updated = await takeTask(projectCode, taskId);

            if (!signalr.isConnected()) {
                setColumns((prev) =>
                    prev.map((c) => ({
                        ...c,
                        tasks: c.tasks.map((t) => (t.id === updated.id ? updated : t)),
                    }))
                );
            }
        } catch (e) {
            console.error('❌ Ошибка взятия задачи:', e);
            setActionError(e.message);
        }
    };

    // ── Загрузить вложение ──
    const handleUpload = async (taskId, file) => {
        if (isArchived) return;
        try {
            setActionError(null);
            const att = await uploadTaskAttachment(projectCode, taskId, file);

            if (!signalr.isConnected()) {
                setColumns((prev) =>
                    prev.map((c) => ({
                        ...c,
                        tasks: c.tasks.map((t) =>
                            t.id === taskId
                                ? {
                                    ...t,
                                    attachmentsCount: (t.attachmentsCount || 0) + 1,
                                    attachments: [...(t.attachments || []), att],
                                }
                                : t
                        ),
                    }))
                );
            }
        } catch (e) {
            console.error('❌ Ошибка загрузки файла:', e);
            setActionError(e.message);
        }
    };

    // ── Создать задачу (с тегами) ──
    const handleCreate = async (payload) => {
        if (isArchived) return;
        try {
            setActionError(null);

            const { tagIds, ...taskPayload } = payload;
            const createdTask = await createTask(projectCode, taskPayload);

            if (Array.isArray(tagIds) && tagIds.length > 0) {
                await setTaskTags(projectCode, createdTask.id, tagIds);
            }

            setIsModalOpen(false);

            if (!signalr.isConnected()) {
                await loadBoard();
            }
            await loadTags();
        } catch (e) {
            console.error('❌ Ошибка создания задачи:', e);
            setActionError(e.message);
        }
    };

    // ── Создать тег проекта ──
    const handleCreateTag = async (dto) => {
        const newTag = await createTag(projectCode, dto);
        setAllTags((prev) =>
            [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
        );
        return newTag;
    };

    // ── Переместить задачу ──
    const handleMove = async (taskId, columnId) => {
        if (isArchived) return;
        try {
            setActionError(null);

            setColumns((prev) => moveTaskLocally(prev, taskId, columnId));

            await moveTask(projectCode, taskId, columnId);
        } catch (e) {
            console.error('❌ Ошибка перемещения задачи:', e);
            setActionError(e.message);
            await loadBoard();
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  УПРАВЛЕНИЕ КОЛОНКАМИ
    // ═══════════════════════════════════════════════════════════

    const handleOpenCreateColumn = () => {
        if (isArchived) return;
        setIsCreatingColumn(true);
    };

    const handleOpenEditColumn = (column) => {
        if (isArchived) return;
        if (!column || column.isDefault) return;
        setEditingColumn(column);
    };

    const handleOpenDeleteColumn = (column) => {
        if (isArchived) return;
        if (!column || column.isDefault) return;
        setDeletingColumn(column);
    };

    const handleColumnSaved = async () => {
        setIsCreatingColumn(false);
        setEditingColumn(null);
        if (!signalr.isConnected()) {
            await loadBoard();
        }
    };

    const handleColumnDeleted = async () => {
        setDeletingColumn(null);
        if (!signalr.isConnected()) {
            await loadBoard();
        }
    };

    // 🆕 Переключение раскладки
    const toggleLayout = () => {
        setLayout((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'));
    };

    if (loading) return <div className="tasks-loading">Загрузка задач…</div>;
    if (error) return <div className="tasks-error">Ошибка: {error}</div>;

    return (
        <div className="tasks-board-wrapper">
            {/* ── Верхняя панель доски ── */}
            <div className="tasks-board-header">
                <h2>Задачи</h2>

                <div className="tasks-board-actions">
                    <button
                        type="button"
                        className="btn btn--secondary btn--sm tasks-layout-toggle"
                        onClick={toggleLayout}
                        title={
                            layout === 'vertical'
                                ? 'Расположить блоки рядами'
                                : 'Расположить блоки столбцами'
                        }
                    >
                        {layout === 'vertical' ? (
                            <>
                                <Rows3 size={14} />
                                Рядами
                            </>
                        ) : (
                            <>
                                <Columns3 size={14} />
                                Столбцами
                            </>
                        )}
                    </button>

                    {!isArchived && (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus size={16} />
                            Создать задачу
                        </button>
                    )}
                </div>
            </div>

            {isArchived && (
                <div className="tasks-archive-banner">
                    <Archive size={16} />
                    Проект в архиве. Задачи доступны только для просмотра.
                </div>
            )}

            {progress && (
                <div className="tasks-progress">
                    <div className="tasks-progress-header">
                        <span>Прогресс проекта</span>
                        <span className="progress-percent">
                            {progress.progressPercent}%
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress.progressPercent}%` }}
                        />
                    </div>
                    <div className="tasks-progress-details">
                        Завершено: <b>{progress.completedTasks}</b> ·{' '}
                        В работе: <b>{progress.inProgressTasks}</b> ·{' '}
                        Не начато: <b>{progress.notStartedTasks}</b> ·{' '}
                        Всего: <b>{progress.totalTasks}</b>
                    </div>
                </div>
            )}

            {actionError && (
                <div className="tasks-action-error">
                    <AlertTriangle size={14} />
                    {actionError}
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={() => setActionError(null)}
                        aria-label="Закрыть"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Доска ── */}
            <div className={`tasks-columns tasks-columns--${layout}`}>
                {visibleColumns.map((col) => (
                    <TaskColumn
                        key={col.id}
                        column={col}
                        columns={columns}
                        projectCode={projectCode}
                        currentUserEmail={currentUserEmail}
                        isOwner={isOwner}
                        isArchived={isArchived}
                        onTake={handleTake}
                        onMove={handleMove}
                        onUpload={handleUpload}
                        onRefresh={loadBoard}
                        onError={setActionError}
                        onEditColumn={handleOpenEditColumn}
                        onDeleteColumn={handleOpenDeleteColumn}
                    />
                ))}

                {!isArchived && isOwner && (
                    <div className="tasks-column-add">
                        <button
                            type="button"
                            className="btn btn--ghost tasks-column-add-btn"
                            onClick={handleOpenCreateColumn}
                            title="Создать новую колонку"
                        >
                            <span className="btn-add-column-icon">
                                <Plus size={24} />
                            </span>
                            <span className="btn-add-column-text">Колонка</span>
                        </button>
                    </div>
                )}
            </div>

            {!isArchived && isModalOpen && (
                <CreateTaskModal
                    columns={columns}
                    projectDeadline={projectDeadline}
                    allTags={allTags}
                    onCreateTag={handleCreateTag}
                    onClose={() => setIsModalOpen(false)}
                    onCreate={handleCreate}
                />
            )}

            {isCreatingColumn && (
                <ColumnEditorModal
                    projectCode={projectCode}
                    column={null}
                    onClose={() => setIsCreatingColumn(false)}
                    onSaved={handleColumnSaved}
                />
            )}

            {editingColumn && (
                <ColumnEditorModal
                    projectCode={projectCode}
                    column={editingColumn}
                    onClose={() => setEditingColumn(null)}
                    onSaved={handleColumnSaved}
                />
            )}

            {deletingColumn && (
                <DeleteColumnModal
                    projectCode={projectCode}
                    column={deletingColumn}
                    allColumns={columns}
                    onClose={() => setDeletingColumn(null)}
                    onDeleted={handleColumnDeleted}
                />
            )}
        </div>
    );
}

// ── Локальное перемещение для мгновенного отображения ──
function moveTaskLocally(columns, taskId, targetColumnId) {
    let movedTask = null;

    const withoutTask = columns.map((col) => {
        const filtered = col.tasks.filter((t) => {
            if (t.id === taskId) {
                movedTask = t;
                return false;
            }
            return true;
        });
        return { ...col, tasks: filtered };
    });

    if (!movedTask) return columns;

    return withoutTask.map((col) =>
        col.id === targetColumnId
            ? {
                ...col,
                tasks: [
                    ...col.tasks,
                    { ...movedTask, columnId: targetColumnId },
                ],
            }
            : col
    );
}