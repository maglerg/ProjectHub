import React, { useEffect, useState } from 'react';
import { getTasksBoard, takeTask, createTask, moveTask } from '../../services/tasksApi';
import TaskColumn from './TaskColumn';
import CreateTaskModal from './CreateTaskModal';
import '../../styles/components/tasks/tasks.css';
export default function TasksBoard({ projectCode, currentUserEmail, isOwner }) {
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionError, setActionError] = useState(null);

    // ── Загрузка доски ──
    const loadBoard = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getTasksBoard(projectCode);
            setColumns(data);
        } catch (e) {
            console.error('❌ Ошибка загрузки задач:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectCode) loadBoard();
    }, [projectCode]);

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
            // оптимистично обновляем локально, чтобы не было "мигания"
            setColumns(prev => moveTaskLocally(prev, taskId, columnId));
            await moveTask(projectCode, taskId, columnId);
            await loadBoard();
        } catch (e) {
            console.error('❌ Ошибка перемещения задачи:', e);
            setActionError(e.message);
            await loadBoard(); // откат при ошибке
        }
    };

    if (loading) return <div className="tasks-loading">Загрузка задач…</div>;
    if (error) return <div className="tasks-error">Ошибка: {error}</div>;

    return (
        <div className="tasks-board-wrapper">
            <div className="tasks-board-header">
                <h2>Задачи</h2>
                <button
                    className="btn-create-task"
                    onClick={() => setIsModalOpen(true)}
                >
                    + Создать задачу
                </button>
            </div>

            {actionError && (
                <div className="tasks-action-error">
                    {actionError}
                    <button onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            <div className="tasks-columns">
                {columns.map(col => (
                    <TaskColumn
                        key={col.id}
                        column={col}
                        currentUserEmail={currentUserEmail}
                        isOwner={isOwner}
                        onTake={handleTake}
                        onMove={handleMove}
                    />
                ))}
            </div>

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