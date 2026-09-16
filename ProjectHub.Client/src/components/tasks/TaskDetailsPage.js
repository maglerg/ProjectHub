import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    TASK_PRIORITIES,
    getPriorityInfo
} from '../../utils/constants';
import {
    toLocalInputValue,
    formatDateTime,
    getDeadlineStatus
} from '../../utils/datetime';
import {
    getTaskById,
    getTasksBoard,
    updateTask,
    takeTask,
    leaveTask,
    deleteTask,
    getTaskComments,
    addTaskComment,
    uploadTaskAttachment,
    downloadTaskAttachment,
    deleteTaskAttachment,
    addTaskSubtask,
    updateTaskSubtask,
    toggleTaskSubtask,
    deleteTaskSubtask
} from '../../services/tasksApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/tasks/tasks.css';

export default function TaskDetailsPage() {
    const { code, taskId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // ── Основное состояние ──
    const [task, setTask] = useState(null);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);

    // ── Форма редактирования ──
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        columnId: '',
        priority: 'None',
        dueDate: '',
        noDueDate: true
    });
    const [saving, setSaving] = useState(false);

    // ── Комментарии ──
    const [comments, setComments] = useState([]);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentSubmitting, setCommentSubmitting] = useState(false);

    // ── Вложения ──
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // ── Подзадачи ──
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [subtaskAdding, setSubtaskAdding] = useState(false);
    const [editingSubtaskId, setEditingSubtaskId] = useState(null);
    const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
    const [subtaskBusyId, setSubtaskBusyId] = useState(null);

    // ═══════════════════════════════════════════════════════════
    //  ЗАГРУЗКА
    // ═══════════════════════════════════════════════════════════

    const loadAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [taskData, board, commentsData] = await Promise.all([
                getTaskById(code, taskId),
                getTasksBoard(code),
                getTaskComments(code, taskId)
            ]);
            setTask(taskData);
            setColumns(board);
            setComments(commentsData);
            setForm({
                title: taskData.title,
                description: taskData.description || '',
                columnId: taskData.columnId,
                priority: taskData.priority || 'None',
                dueDate: taskData.dueDate ? toLocalInputValue(taskData.dueDate) : '',
                noDueDate: !taskData.dueDate
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

    // ═══════════════════════════════════════════════════════════
    //  ЗАДАЧА — ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════

    const handleTake = async () => {
        try {
            setActionError(null);
            const updated = await takeTask(code, taskId);
            setTask(updated);
        } catch (e) {
            setActionError(e.message);
        }
    };

    const handleRemoveAssignee = async (email) => {
        const isSelf =
            (email || '').toLowerCase() === (user?.email || '').toLowerCase();
        const message = isSelf
            ? 'Снять себя с задачи?'
            : `Снять исполнителя ${email} с задачи?`;

        if (!window.confirm(message)) return;

        try {
            setActionError(null);
            const updated = await leaveTask(code, taskId, isSelf ? null : email);
            setTask(updated);
        } catch (e) {
            setActionError(e.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || saving) return;

        // Клиентская проверка дедлайна
        if (!form.noDueDate && form.dueDate && task.projectDeadline) {
            if (new Date(form.dueDate) > new Date(task.projectDeadline)) {
                setActionError('Дедлайн задачи не может быть позже дедлайна проекта.');
                return;
            }
        }

        setSaving(true);
        try {
            setActionError(null);
            const updated = await updateTask(code, taskId, {
                title: form.title.trim(),
                description: form.description.trim() || null,
                columnId: form.columnId,
                priority: form.priority,
                dueDate: form.noDueDate || !form.dueDate
                    ? null
                    : new Date(form.dueDate).toISOString()
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

    const handleCancelEdit = () => {
        setIsEditing(false);
        setForm({
            title: task.title,
            description: task.description || '',
            columnId: task.columnId,
            priority: task.priority || 'None',
            dueDate: task.dueDate ? toLocalInputValue(task.dueDate) : '',
            noDueDate: !task.dueDate
        });
    };

    const handleDelete = async () => {
        if (!window.confirm('Удалить задачу? Это действие необратимо.')) return;
        try {
            setActionError(null);
            await deleteTask(code, taskId);
            navigate(`/projects/${code}/dashboard`);
        } catch (e) {
            setActionError(e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  КОММЕНТАРИИ
    // ═══════════════════════════════════════════════════════════

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || commentSubmitting) return;

        setCommentSubmitting(true);
        try {
            setActionError(null);
            const newComment = await addTaskComment(code, taskId, commentText.trim());
            setComments(prev => [...prev, newComment]);
            setCommentText('');
            setShowCommentBox(false);
        } catch (e) {
            console.error('❌ Ошибка добавления комментария:', e);
            setActionError(e.message);
        } finally {
            setCommentSubmitting(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  ВЛОЖЕНИЯ
    // ═══════════════════════════════════════════════════════════

    const formatSize = (bytes) => {
        if (!bytes) return '0 Б';
        const units = ['Б', 'КБ', 'МБ', 'ГБ'];
        let i = 0, v = bytes;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
    };

    const handleUploadFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size === 0) {
            setActionError('Файл пустой');
            e.target.value = '';
            return;
        }

        setUploading(true);
        try {
            setActionError(null);
            const newAtt = await uploadTaskAttachment(code, taskId, file);
            setTask(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), newAtt]
            }));
        } catch (err) {
            console.error('❌ Ошибка загрузки файла:', err);
            setActionError(err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDownloadFile = async (att) => {
        try {
            await downloadTaskAttachment(code, taskId, att.id, att.fileName);
        } catch (e) {
            setActionError(e.message);
        }
    };

    const handleDeleteFile = async (att) => {
        if (!window.confirm(`Удалить файл "${att.fileName}"?`)) return;
        try {
            setActionError(null);
            await deleteTaskAttachment(code, taskId, att.id);
            setTask(prev => ({
                ...prev,
                attachments: (prev.attachments || []).filter(a => a.id !== att.id)
            }));
        } catch (e) {
            setActionError(e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  ПОДЗАДАЧИ
    // ═══════════════════════════════════════════════════════════

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        const title = newSubtaskTitle.trim();
        if (!title || subtaskAdding) return;

        setSubtaskAdding(true);
        try {
            setActionError(null);
            const newSubtask = await addTaskSubtask(code, taskId, title);

            setTask(prev => {
                const updated = {
                    ...prev,
                    subtasks: [...(prev.subtasks || []), newSubtask]
                };
                updated.hasSubtasks = updated.subtasks.length > 0;
                updated.totalSubtasksCount = updated.subtasks.length;
                updated.completedSubtasksCount = updated.subtasks.filter(s => s.isCompleted).length;
                return updated;
            });

            setNewSubtaskTitle('');
        } catch (e) {
            console.error('❌ Ошибка добавления подзадачи:', e);
            setActionError(e.message);
        } finally {
            setSubtaskAdding(false);
        }
    };

    const handleToggleSubtask = async (subtask) => {
        if (subtaskBusyId) return;
        setSubtaskBusyId(subtask.id);
        try {
            setActionError(null);
            const updated = await toggleTaskSubtask(code, taskId, subtask.id);
            setTask(updated);
        } catch (e) {
            console.error('❌ Ошибка toggle подзадачи:', e);
            setActionError(e.message);
        } finally {
            setSubtaskBusyId(null);
        }
    };

    const handleStartEditSubtask = (subtask) => {
        setEditingSubtaskId(subtask.id);
        setEditingSubtaskTitle(subtask.title);
    };

    const handleSaveSubtask = async (subtaskId) => {
        const title = editingSubtaskTitle.trim();
        if (!title) return;

        try {
            setActionError(null);
            const updated = await updateTaskSubtask(code, taskId, subtaskId, title);
            setTask(prev => ({
                ...prev,
                subtasks: prev.subtasks.map(s => s.id === subtaskId ? updated : s)
            }));
            setEditingSubtaskId(null);
            setEditingSubtaskTitle('');
        } catch (e) {
            console.error('❌ Ошибка обновления подзадачи:', e);
            setActionError(e.message);
        }
    };

    const handleCancelEditSubtask = () => {
        setEditingSubtaskId(null);
        setEditingSubtaskTitle('');
    };

    const handleDeleteSubtask = async (subtask) => {
        if (!window.confirm(`Удалить подзадачу "${subtask.title}"?`)) return;
        try {
            setActionError(null);
            const updated = await deleteTaskSubtask(code, taskId, subtask.id);
            setTask(updated);
        } catch (e) {
            console.error('❌ Ошибка удаления подзадачи:', e);
            setActionError(e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════

    if (loading) return <div className="tasks-loading">Загрузка задачи…</div>;
    if (error) return <div className="tasks-error">Ошибка: {error}</div>;
    if (!task) return <div className="tasks-error">Задача не найдена</div>;

    const assignees = task.assignees || [];
    const attachments = task.attachments || [];
    const emailLower = (user?.email || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const isTaken = assignees.length > 0;
    const isOwnerUser = !!task.isOwner;

    const priorityInfo = getPriorityInfo(task.priority);
    const deadlineStatus = getDeadlineStatus(task.dueDate, !!task.completedAt);

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
                        <h1>
                            {task.priority && task.priority !== 'None' && (
                                <span
                                    className="task-priority-icon-lg"
                                    title={priorityInfo.label}
                                    style={{ color: priorityInfo.color }}
                                >
                                    {priorityInfo.icon}
                                </span>
                            )}
                            {task.title}
                        </h1>

                        <div className="task-details-actions">
                            {task.canEdit && (
                                <button
                                    className="btn-edit"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Редактировать
                                </button>
                            )}

                            <button
                                className="btn-comment"
                                onClick={() => setShowCommentBox(v => !v)}
                                title="Оставить комментарий"
                            >
                                Комментировать
                            </button>

                            {isOwnerUser && (
                                <button
                                    className="btn-delete-task"
                                    onClick={handleDelete}
                                    title="Удалить задачу"
                                >
                                    Удалить
                                </button>
                            )}

                            {!isMine && (
                                <button
                                    className="btn-take-task"
                                    onClick={handleTake}
                                    title={isTaken ? 'Присоединиться к задаче' : 'Взять задачу'}
                                >
                                    {isTaken ? 'Присоединиться' : 'Взять задачу'}
                                </button>
                            )}
                        </div>
                    </header>

                    {showCommentBox && (
                        <form className="comment-box" onSubmit={handleSubmitComment}>
                            <textarea
                                rows={3}
                                maxLength={2000}
                                placeholder="Напишите комментарий…"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                autoFocus
                            />
                            <div className="comment-box-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCommentBox(false);
                                        setCommentText('');
                                    }}
                                    disabled={commentSubmitting}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={commentSubmitting || !commentText.trim()}
                                >
                                    {commentSubmitting ? 'Отправка…' : 'Отправить'}
                                </button>
                            </div>
                        </form>
                    )}

                    <section className="task-details-body">
                        <div className="task-details-meta">
                            <span><b>Блок:</b> {task.columnName}</span>
                            <span>
                                <b>Приоритет:</b>{' '}
                                {priorityInfo.icon} {priorityInfo.label}
                            </span>
                            <span>
                                <b>Дедлайн:</b>{' '}
                                {task.dueDate ? (
                                    <span className={deadlineStatus}>
                                        {formatDateTime(task.dueDate)}
                                        {deadlineStatus === 'overdue' && ' ⚠️'}
                                    </span>
                                ) : (
                                    'Без дедлайна'
                                )}
                            </span>
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
                                                        title={isSelf ? 'Снять задачу' : 'Снять исполнителя'}
                                                        onClick={() => handleRemoveAssignee(a.email)}
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

                        {/* ── Подзадачи ── */}
                        <div className="task-details-subtasks">
                            <div className="subtasks-header">
                                <h3>
                                    Подзадачи ({task.completedSubtasksCount || 0}/{task.totalSubtasksCount || 0})
                                </h3>

                                {task.subtasks?.length > 0 && (
                                    <div className="subtasks-mini-progress">
                                        <div
                                            className="subtasks-mini-progress-fill"
                                            style={{
                                                width: `${(task.completedSubtasksCount / task.totalSubtasksCount) * 100}%`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {(!task.subtasks || task.subtasks.length === 0) ? (
                                <p className="no-subtasks">Подзадач пока нет</p>
                            ) : (
                                <ul className="subtasks-list">
                                    {task.subtasks.map(s => (
                                        <li
                                            key={s.id}
                                            className={`subtask-item ${s.isCompleted ? 'completed' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={s.isCompleted}
                                                disabled={!task.canEdit || subtaskBusyId === s.id}
                                                onChange={() => handleToggleSubtask(s)}
                                            />

                                            {editingSubtaskId === s.id ? (
                                                <input
                                                    type="text"
                                                    className="subtask-edit-input"
                                                    value={editingSubtaskTitle}
                                                    onChange={e => setEditingSubtaskTitle(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveSubtask(s.id);
                                                        if (e.key === 'Escape') handleCancelEditSubtask();
                                                    }}
                                                    onBlur={() => handleSaveSubtask(s.id)}
                                                    autoFocus
                                                    maxLength={255}
                                                />
                                            ) : (
                                                <span
                                                    className="subtask-title"
                                                    onDoubleClick={() =>
                                                        task.canEdit && handleStartEditSubtask(s)
                                                    }
                                                    title={task.canEdit ? 'Двойной клик — редактировать' : ''}
                                                >
                                                    {s.title}
                                                </span>
                                            )}

                                            {task.canEdit && editingSubtaskId !== s.id && (
                                                <div className="subtask-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-subtask-edit"
                                                        title="Редактировать"
                                                        onClick={() => handleStartEditSubtask(s)}
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-subtask-delete"
                                                        title="Удалить"
                                                        onClick={() => handleDeleteSubtask(s)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {task.canEdit && (
                                <form className="subtask-add-form" onSubmit={handleAddSubtask}>
                                    <input
                                        type="text"
                                        placeholder="Новая подзадача…"
                                        value={newSubtaskTitle}
                                        onChange={e => setNewSubtaskTitle(e.target.value)}
                                        maxLength={255}
                                        disabled={subtaskAdding}
                                    />
                                    <button
                                        type="submit"
                                        disabled={subtaskAdding || !newSubtaskTitle.trim()}
                                    >
                                        {subtaskAdding ? '…' : '+ Добавить'}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* ── Вложения ── */}
                        <div className="task-details-attachments">
                            <div className="attachments-header">
                                <h3>Вложения ({attachments.length})</h3>

                                {task.canUploadAttachments && (
                                    <>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleUploadFile}
                                        />
                                        <button
                                            type="button"
                                            className="btn-upload-attachment"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                        >
                                            {uploading ? 'Загрузка…' : '📎 Прикрепить файл'}
                                        </button>
                                    </>
                                )}
                            </div>

                            {attachments.length === 0 ? (
                                <p className="no-attachments">Файлов пока нет</p>
                            ) : (
                                <ul className="attachments-list">
                                    {attachments.map(att => (
                                        <li key={att.id} className="attachment-item">
                                            <span className="attachment-icon">📄</span>
                                            <div className="attachment-info">
                                                <button
                                                    type="button"
                                                    className="attachment-name"
                                                    onClick={() => handleDownloadFile(att)}
                                                    title="Скачать"
                                                >
                                                    {att.fileName}
                                                </button>
                                                <span className="attachment-meta">
                                                    {formatSize(att.sizeBytes)} ·{' '}
                                                    {att.uploadedByName || att.uploadedByEmail} ·{' '}
                                                    {new Date(att.uploadedAt).toLocaleString('ru-RU')}
                                                </span>
                                            </div>
                                            {att.canDelete && (
                                                <button
                                                    className="btn-remove-attachment"
                                                    title="Удалить файл"
                                                    onClick={() => handleDeleteFile(att)}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* ── Комментарии ── */}
                        <div className="task-details-comments">
                            <h3>Комментарии ({comments.length})</h3>

                            {comments.length === 0 ? (
                                <p className="no-comments">Комментариев пока нет</p>
                            ) : (
                                <ul className="comments-list">
                                    {comments.map(c => (
                                        <li key={c.id} className="comment-item">
                                            <div className="comment-header">
                                                <span className="comment-author">
                                                    {c.authorName || c.authorEmail}
                                                </span>
                                                {c.authorSpecialization && (
                                                    <span className="comment-spec">
                                                        — {c.authorSpecialization}
                                                    </span>
                                                )}
                                                <span className="comment-date">
                                                    {new Date(c.createdAt).toLocaleString('ru-RU')}
                                                </span>
                                            </div>
                                            <p className="comment-text">{c.text}</p>
                                        </li>
                                    ))}
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

                    <label>
                        Приоритет
                        <select
                            value={form.priority}
                            onChange={e => setForm({ ...form, priority: e.target.value })}
                        >
                            {TASK_PRIORITIES.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.icon} {p.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={form.noDueDate}
                                onChange={e => setForm({
                                    ...form,
                                    noDueDate: e.target.checked,
                                    dueDate: e.target.checked ? '' : form.dueDate
                                })}
                            />
                            Без дедлайна
                        </label>

                        {!form.noDueDate && (
                            <label>
                                Дедлайн задачи
                                <input
                                    type="datetime-local"
                                    value={form.dueDate}
                                    max={task.projectDeadline ? toLocalInputValue(task.projectDeadline) : ''}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    required
                                />
                                {task.projectDeadline && (
                                    <small className="form-hint">
                                        Не позднее: {formatDateTime(task.projectDeadline)}
                                    </small>
                                )}
                            </label>
                        )}
                    </div>

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