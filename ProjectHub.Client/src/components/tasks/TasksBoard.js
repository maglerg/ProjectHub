import React, { useEffect, useState } from 'react';
import {
    getTasksBoard,
    takeTask,
    createTask,
    moveTask,
    uploadTaskAttachment,
    getProjectProgress
} from '../../services/tasksApi';
import { TASK_PRIORITIES } from '../../utils/constants';
import TaskColumn from './TaskColumn';
import CreateTaskModal from './CreateTaskModal';
import '../../styles/components/tasks/tasks.css';

export default function TasksBoard({ projectCode, currentUserEmail, isOwner }) {
    const [columns, setColumns] = useState([]);
    const [progress, setProgress] = useState(null);
    const [onlyMyTasks, setOnlyMyTasks] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionError, setActionError] = useState(null);

    // ── Загрузка доски и прогресса ──
    const loadBoard = async () => {
        try {
            setLoading(true);
            setError(null);
            const [boardData, progressData] = await Promise.all([
                getTasksBoard(projectCode),
                getProjectProgress(projectCode)
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

    useEffect(() => {
        if (projectCode) loadBoard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectCode]);

    // ── Фильтрация: «Мои» + приоритет ──
    const filterColumns = (cols) => {
        const emailLower = (currentUserEmail || '').toLowerCase();
        const useMy = onlyMyTasks;
        const usePriority = priorityFilter !== 'All';

        if (!useMy && !usePriority) return cols;

        return cols.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => {
                if (useMy) {
                    const isMine = (t.assignees || []).some(
                        a => (a.email || '').toLowerCase() === emailLower
                    );
                    if (!isMine) return false;
                }
                if (usePriority && t.priority !== priorityFilter) return false;
                return true;
            })
        }));
    };

    const visibleColumns = filterColumns(columns);
    const hasVisibleTasks = visibleColumns.some(c => c.tasks.length > 0);
    const isFiltering = onlyMyTasks || priorityFilter !== 'All';

    // ── Взять задачу ──
    const handleTake = async (taskId) => {
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
        try {
            setActionError(null);
            await uploadTaskAttachment(projectCode, taskId, file);
            await loadBoard();
        } catch (e) {
            console.error('❌ Ошибка загрузки файла:', e);
            setActionError(e.message);
        }
    };

    // ── Создать задачу ──
    const handleCreate = async (payload) => {
        try {
            setActionError(null);
            await createTask(projectCode, payload);
            setIsModalOpen(false);
            await loadBoard();
        } catch (e) {
            console.error('❌ Ошибка создания задачи:', e);
            setActionError(e.message);
        }
    };

    // ── Переместить задачу ──
    const handleMove = async (taskId, columnId) => {
        try {
            setActionError(null);
            setColumns(prev => moveTaskLocally(prev, taskId, columnId));
            await moveTask(projectCode, taskId, columnId);
            await loadBoard();
        } catch (e) {
            console.error('❌ Ошибка перемещения задачи:', e);
            setActionError(e.message);
            await loadBoard();
        }
    };

    if (loading) return <div className="tasks-loading">Загрузка задач…</div>;
    if (error) return <div className="tasks-error">Ошибка: {error}</div>;

    return (
        <div className="tasks-board-wrapper">
            <div className="tasks-board-header">
                <h2>Задачи</h2>

                <div className="tasks-board-actions">
                    {/* ── Кнопка «Все / Мои задачи» ── */}
                    <button
                        type="button"
                        className={`btn-filter-my ${onlyMyTasks ? 'active' : ''}`}
                        onClick={() => setOnlyMyTasks(v => !v)}
                        title={
                            onlyMyTasks
                                ? 'Показать все задачи'
                                : 'Показать только мои задачи'
                        }
                    >
                        {onlyMyTasks ? '📋 Все задачи' : '👤 Мои задачи'}
                    </button>

                    {/* ── Фильтр по приоритету ── */}
                    <select
                        className={`priority-filter ${priorityFilter !== 'All' ? 'active' : ''}`}
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                        title="Фильтр по приоритету"
                    >
                        <option value="All">Все</option>
                        {TASK_PRIORITIES.map(p => (
                            <option key={p.value} value={p.value}>
                                {p.icon} {p.label}
                            </option>
                        ))}
                    </select>

                    <button
                        className="btn-create-task"
                        onClick={() => setIsModalOpen(true)}
                    >
                        + Создать задачу
                    </button>
                </div>
            </div>

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

            {/* ── Доска / пустое состояние ── */}
            {isFiltering && !hasVisibleTasks ? (
                <div className="tasks-empty-filter">
                    <p>По выбранным фильтрам задач не найдено.</p>
                    <button
                        className="btn-reset-filters"
                        onClick={() => {
                            setOnlyMyTasks(false);
                            setPriorityFilter('All');
                        }}
                    >
                        Сбросить фильтры
                    </button>
                </div>
            ) : (
                <div className="tasks-columns">
                    {visibleColumns.map(col => (
                        <TaskColumn
                            key={col.id}
                            column={col}
                            projectCode={projectCode}
                            currentUserEmail={currentUserEmail}
                            isOwner={isOwner}
                            onTake={handleTake}
                            onMove={handleMove}
                            onUpload={handleUpload}
                        />
                    ))}
                </div>
            )}

            {isModalOpen && (
                <CreateTaskModal
                    columns={columns}
                    onClose={() => setIsModalOpen(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}

// ── Локальное перемещение для мгновенного отображения ──
function moveTaskLocally(columns, taskId, targetColumnId) {
    let movedTask = null;

    const withoutTask = columns.map(col => {
        const filtered = col.tasks.filter(t => {
            if (t.id === taskId) {
                movedTask = t;
                return false;
            }
            return true;
        });
        return { ...col, tasks: filtered };
    });

    if (!movedTask) return columns;

    return withoutTask.map(col =>
        col.id === targetColumnId
            ? { ...col, tasks: [...col.tasks, { ...movedTask, columnId: targetColumnId }] }
            : col
    );
}