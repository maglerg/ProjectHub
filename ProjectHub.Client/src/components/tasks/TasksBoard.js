// projecthub.client/src/components/tasks/TasksBoard.js

import React, { useEffect, useState } from 'react';
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
    // 📌 Фильтры приходят снаружи (панель в сайдбаре дашборда)
    filters = {},
    // 📌 Проект в архиве — только просмотр
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

    // 🆕 Состояние для управления колонками
    const [isCreatingColumn, setIsCreatingColumn] = useState(false);
    const [editingColumn, setEditingColumn] = useState(null);
    const [deletingColumn, setDeletingColumn] = useState(null);

    // ── Загрузка доски и прогресса ──
    const loadBoard = async () => {
        try {
            setLoading(true);
            setError(null);
            const [boardData, progressData] = await Promise.all([
                getTasksBoard(projectCode),
                getProjectProgress(projectCode),
            ]);
            setColumns(boardData);
            setProgress(progressData);
        } catch (e) {
            console.error('❌ Ошибка загрузки задач:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Загрузка тегов проекта ──
    const loadTags = async () => {
        try {
            const tags = await getProjectTags(projectCode);
            setAllTags(tags);
        } catch (e) {
            console.warn('Не удалось загрузить теги проекта:', e);
        }
    };

    useEffect(() => {
        if (projectCode) {
            loadBoard();
            loadTags();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectCode]);
    useEffect(() => {
        console.log('🟢 TasksBoard rendered. projectCode =', projectCode);
    });
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
            await takeTask(projectCode, taskId);
            await loadBoard();
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
            await uploadTaskAttachment(projectCode, taskId, file);
            await loadBoard();
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
            await loadBoard();
            await loadTags();
        } catch (e) {
            console.error('❌ Ошибка создания задачи:', e);
            setActionError(e.message);
        }
    };

    // ── Создать тег проекта (для модалки создания задачи) ──
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
            await loadBoard();
        } catch (e) {
            console.error('❌ Ошибка перемещения задачи:', e);
            setActionError(e.message);
            await loadBoard();
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  🆕 УПРАВЛЕНИЕ КОЛОНКАМИ
    // ═══════════════════════════════════════════════════════════

    const handleOpenCreateColumn = () => {
        if (isArchived) return;
        setIsCreatingColumn(true);
    };

    const handleOpenEditColumn = (column) => {
        if (isArchived) return;
        if (!column) return;
        if (column.isDefault) return;
        setEditingColumn(column);
    };

    const handleOpenDeleteColumn = (column) => {
        if (isArchived) return;
        if (!column) return;
        if (column.isDefault) return;
        setDeletingColumn(column);
    };

    const handleColumnSaved = async () => {
        setIsCreatingColumn(false);
        setEditingColumn(null);
        await loadBoard();
    };

    const handleColumnDeleted = async () => {
        setDeletingColumn(null);
        await loadBoard();
    };

    if (loading) return <div className="tasks-loading">Загрузка задач…</div>;
    if (error) return <div className="tasks-error">Ошибка: {error}</div>;

    return (
        <div className="tasks-board-wrapper">
            {/* ── Верхняя панель доски: заголовок + кнопка создания ── */}
            <div className="tasks-board-header">
                <h2>Задачи</h2>

                <div className="tasks-board-actions">
                    {!isArchived && (
                        <button
                            className="btn-create-task"
                            onClick={() => setIsModalOpen(true)}
                        >
                            + Создать задачу
                        </button>
                    )}
                </div>
            </div>

            {/* 📌 Плашка «Проект в архиве» */}
            {isArchived && (
                <div className="tasks-archive-banner">
                    📦 Проект в архиве. Задачи доступны только для просмотра.
                </div>
            )}

            {/* ── Прогресс проекта ── */}
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
                    {actionError}
                    <button onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            {/* ── Доска ── */}
            <div className="tasks-columns">
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

                {/* 🆕 Кнопка «+ Колонка» — только владелец и не в архиве */}
                {!isArchived && isOwner && (
                    <div className="tasks-column-add">
                        <button
                            type="button"
                            className="btn-add-column"
                            onClick={handleOpenCreateColumn}
                            title="Создать новую колонку"
                        >
                            <span className="btn-add-column-icon">＋</span>
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

            {/* 🆕 Модалки управления колонками */}
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