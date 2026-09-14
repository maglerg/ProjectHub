import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getTaskById,
    getTasksBoard,
    updateTask,
    takeTask,
    leaveTask
} from '../../services/tasksApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/tasks/tasks.css';

export default function TaskDetailsPage() {
    const { code, taskId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [task, setTask] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', columnId: '' });
    const [saving, setSaving] = useState(false);

    // ── Загрузка ──
    const loadAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [taskData, board] = await Promise.all([
                getTaskById(code, taskId),
                getTasksBoard(code)
            ]);
            setTask(taskData);
            setColumns(board);
            setForm({
                title: taskData.title,
                description: taskData.description || '',
                columnId: taskData.columnId
            });
        } catch (e) {
            console.error('❌ Ошибка загрузки задачи:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (code && taskId) loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, taskId]);

    // ── Взять задачу ──
    const handleTake = async () => {
        try {
            setActionError(null);
            const updated = await takeTask(code, taskId);
            setTask(updated);
        } catch (e) {
            setActionError(e.message);
        }
    };

    // ── Снять исполнителя (себя или чужого — единый обработчик) ──
    const handleRemoveAssignee = async (email) => {
        const isSelf = (email || '').toLowerCase() === (user?.email || '').toLowerCase();
        const message = isSelf
            ? 'Снять себя с задачи?'
            : `Снять исполнителя ${email} с задачи?`;

        if (!window.confirm(message)) return;

        try {
            setActionError(null);
            // Если снимаем себя — email можно не передавать
            const updated = await leaveTask(code, taskId, isSelf ? null : email);
            setTask(updated);
        } catch (e) {
            setActionError(e.message);
        }
    };

    // ── Сохранить изменения ──
    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || saving) return;

        setSaving(true);
        try {
            setActionError(null);
            const updated = await updateTask(code, taskId, {
                title: form.title.trim(),
                description: form.description.trim() || null,
                columnId: form.columnId
            });
            setTask(updated);
            setIsEditing(false);
        } catch (e) {
            console.error('❌ Ошибка сохранения задачи:', e);
            setActionError(e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Отмена редактирования ──
    const handleCancelEdit = () => {
        setIsEditing(false);
        setForm({
            title: task.title,
            description: task.description || '',
            columnId: task.columnId
        });
    };

    if (loading) return <div className="tasks-loading">Загрузка задачи…</div>;
    if (error) return <div className="tasks-error">Ошибка: {error}</div>;
    if (!task) return <div className="tasks-error">Задача не найдена</div>;

    const assignees = task.assignees || [];
    const emailLower = (user?.email || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const isTaken = assignees.length > 0;
    const isOwnerUser = !!task.isOwner;

    return (
        <div className="task-details-page">
            <button className="btn-back" onClick={() => navigate(-1)}>
                ← Назад
            </button>

            {actionError && (
                <div className="tasks-action-error">
                    {actionError}
                    <button onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            {!isEditing ? (
                <>
                    <header className="task-details-header">
                        <h1>{task.title}</h1>

                        <div className="task-details-actions">
                            {task.canEdit && (
                                <button
                                    className="btn-edit"
                                    onClick={() => setIsEditing(true)}
                                >
                                    ✏️ Редактировать
                                </button>
                            )}

                            {!isTaken && (
                                <button
                                    className="btn-take-task"
                                    onClick={handleTake}
                                >
                                    Взять задачу
                                </button>
                            )}
                        </div>
                    </header>

                    <section className="task-details-body">
                        <div className="task-details-meta">
                            <span><b>Блок:</b> {task.columnName}</span>
                            <span>
                                <b>Создал:</b>{' '}
                                {task.createdByName || task.createdByEmail}
                            </span>
                            <span>
                                <b>Создано:</b>{' '}
                                {new Date(task.createdAt).toLocaleString('ru-RU')}
                            </span>
                            {task.updatedAt && (
                                <span>
                                    <b>Обновлено:</b>{' '}
                                    {new Date(task.updatedAt).toLocaleString('ru-RU')}
                                </span>
                            )}
                            {task.completedAt && (
                                <span>
                                    <b>Завершено:</b>{' '}
                                    {new Date(task.completedAt).toLocaleString('ru-RU')}
                                </span>
                            )}
                        </div>

                        <div className="task-details-description">
                            <h3>Описание</h3>
                            <p>{task.description || '—'}</p>
                        </div>

                        <div className="task-details-assignees">
                            <h3>Исполнители</h3>

                            {assignees.length === 0 ? (
                                <p>Пока никто не взял</p>
                            ) : (
                                <ul className="assignees-list">
                                    {assignees.map(a => {
                                        const isSelf =
                                            (a.email || '').toLowerCase() === emailLower;

                                        // Кнопку снятия видит:
                                        //   • владелец — у каждого исполнителя
                                        //   • сам исполнитель — только у себя
                                        const canRemove = isOwnerUser || isSelf;

                                        return (
                                            <li key={a.email} className="assignee-row">
                                                <span className="assignee-info">
                                                    {a.name}{' '}
                                                    <span className="assignee-email">
                                                        ({a.email})
                                                    </span>
                                                    {a.specialization && (
                                                        <span className="assignee-spec">
                                                            {' '}— {a.specialization}
                                                        </span>
                                                    )}
                                                </span>

                                                {canRemove && (
                                                    <button
                                                        className="btn-remove-assignee"
                                                        title={
                                                            isSelf
                                                                ? 'Снять задачу'
                                                                : 'Снять исполнителя'
                                                        }
                                                        onClick={() =>
                                                            handleRemoveAssignee(a.email)
                                                        }
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </section>
                </>
            ) : (
                <form className="task-edit-form" onSubmit={handleSave}>
                    <h2>Редактирование задачи</h2>

                    <label>
                        Название *
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            maxLength={255}
                            required
                        />
                    </label>

                    <label>
                        Описание
                        <textarea
                            rows={6}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </label>

                    <label>
                        Блок
                        <select
                            value={form.columnId}
                            onChange={e => setForm({ ...form, columnId: e.target.value })}
                        >
                            {columns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </label>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={saving}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.title.trim()}
                        >
                            {saving ? 'Сохранение…' : 'Сохранить'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}