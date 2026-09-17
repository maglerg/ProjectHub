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
import TaskTimeline from './TaskTimeline';

export default function TasksBoard({
    projectCode,
    projectDeadline,
    currentUserEmail,
    isOwner
}) {
    const [columns, setColumns] = useState([]);
    const [progress, setProgress] = useState(null);
    const [onlyMyTasks, setOnlyMyTasks] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [onlyActive, setOnlyActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);

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

    // ── Проверка: задача "активная"? ──
    const isTaskActive = (t) => {
        // Завершённые — активные (уже сделаны)
        if (t.completedAt) return true;

        // Кто-то взял — активная
        if ((t.assignees || []).length > 0) return true;

        // Есть дата старта — проверяем, наступила ли она
        if (t.startDate) {
            const start = new Date(t.startDate);
            const now = new Date();
            if (start <= now) return true;
        }

        // Иначе — не активная (ждёт старта)
        return false;
    };

    // ── Фильтрация: «Мои» + приоритет + «Только активные» ──
    const filterColumns = (cols) => {
        const emailLower = (currentUserEmail || '').toLowerCase();
        const useMy = onlyMyTasks;
        const usePriority = priorityFilter !== 'All';
        const useActive = onlyActive;
        const useHideCompleted = hideCompleted;

        if (!useMy && !usePriority && !useActive && !useHideCompleted) return cols;

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
                if (useActive && !isTaskActive(t)) return false;
                if (useHideCompleted && t.completedAt) return false;
                return true;
            })
        }));
    };

    const visibleColumns = filterColumns(columns);
    const hasVisibleTasks = visibleColumns.some(c => c.tasks.length > 0);
    const isFiltering =
        onlyMyTasks || priorityFilter !== 'All' || onlyActive || hideCompleted;

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

                    {/* ── Кнопка «Только активные» ── */}
                    <button
                        type="button"
                        className={`btn-filter-active ${onlyActive ? 'active' : ''}`}
                        onClick={() => setOnlyActive(v => !v)}
                        title={
                            onlyActive
                                ? 'Показать все задачи, включая ещё не начатые'
                                : 'Скрыть задачи, которые ещё не начались'
                        }
                    >
                        {onlyActive ? '🚀 Только активные' : '🗂 Все задачи'}
                    </button>
                    <button
                        type="button"
                        className={`btn-filter-hide-completed ${hideCompleted ? 'active' : ''}`}
                        onClick={() => setHideCompleted(v => !v)}
                        title={
                            hideCompleted
                                ? 'Показать завершённые задачи'
                                : 'Скрыть завершённые задачи'
                        }
                    >
                        {hideCompleted ? '🙈 Без завершённых' : '✅ Все задачи'}
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
                    <button
                        type="button"
                        className={`btn-timeline ${showTimeline ? 'active' : ''}`}
                        onClick={() => setShowTimeline(v => !v)}
                        title={showTimeline ? 'Скрыть таймлайн' : 'Показать таймлайн задач'}
                    >
                        📅 {showTimeline ? 'Скрыть таймлайн' : 'Таймлайн'}
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
                            setOnlyActive(false);
                            setHideCompleted(false);
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
                            columns={columns}
                            projectCode={projectCode}
                            currentUserEmail={currentUserEmail}
                            isOwner={isOwner}
                            onTake={handleTake}
                            onMove={handleMove}
                            onUpload={handleUpload}
                            onRefresh={loadBoard}
                            onError={setActionError}
                        />
                    ))}
                </div>
            )}
            {showTimeline && (
                <div className="timeline-section">
                    <h3 className="timeline-section-title">📅 Таймлайн задач</h3>
                    <TaskTimeline columns={columns} />
                </div>
            )}
            {isModalOpen && (
                <CreateTaskModal
                    columns={columns}
                    projectDeadline={projectDeadline}
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