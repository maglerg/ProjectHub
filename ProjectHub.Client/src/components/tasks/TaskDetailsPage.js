import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    TASK_PRIORITIES,
    getPriorityInfo
} from '../../utils/constants';
import {
    toLocalInputValue,
    formatDateTime,
    getDeadlineStatus,
    validateDateRange
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
    deleteTaskSubtask,
    getProjectTags,
    createTag,
    deleteTag,
    setTaskTags
} from '../../services/tasksApi';
import { searchMyProjectByCode } from '../../services/projectsApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/tasks/tasks.css';

export default function TaskDetailsPage() {
    const { code, taskId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    // ?edit=1 открывает форму редактирования сразу
    const startInEditMode = searchParams.get('edit') === '1';

    // ── Основное состояние ──
    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);         // для isArchived
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
        startDate: '',
        noStartDate: true,
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

    // ── Теги ──
    const [allTags, setAllTags] = useState([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#4f46e5');
    const [tagSubmitting, setTagSubmitting] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState(false);

    // ═══════════════════════════════════════════════════════════
    //  ЗАГРУЗКА
    // ═══════════════════════════════════════════════════════════

    const loadAll = async () => {
        setLoading(true);
        setError(null);
        try {
            const [taskData, board, commentsData, tagsData, projectData] = await Promise.all([
                getTaskById(code, taskId),
                getTasksBoard(code),
                getTaskComments(code, taskId),
                getProjectTags(code),
                searchMyProjectByCode(code)
            ]);
            setTask(taskData);
            setColumns(board);
            setComments(commentsData);
            setAllTags(tagsData);
            setProject(projectData);
            setForm({
                title: taskData.title,
                description: taskData.description || '',
                columnId: taskData.columnId,
                priority: taskData.priority || 'None',
                startDate: taskData.startDate ? toLocalInputValue(taskData.startDate) : '',
                noStartDate: !taskData.startDate,
                dueDate: taskData.dueDate ? toLocalInputValue(taskData.dueDate) : '',
                noDueDate: !taskData.dueDate
            });

            // Открываем форму, если пришли с ?edit=1 и проект не архивный
            if (startInEditMode && !projectData?.isArchived) {
                setIsEditing(true);
            }
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

    // 📦 Архив — страница только для чтения
    const isArchived = !!project?.isArchived;

    // ═══════════════════════════════════════════════════════════
    //  ЗАДАЧА — ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════

    const handleTake = async () => {
        if (isArchived) return;
        try {
            setActionError(null);
            const updated = await takeTask(code, taskId);
            setTask(updated);
        } catch (e) {
            setActionError(e.message);
        }
    };

    const handleRemoveAssignee = async (email) => {
        if (isArchived) return;
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
        if (isArchived) return;
        if (!form.title.trim() || saving) return;

        const rangeError = validateDateRange(
            form.noStartDate ? null : form.startDate,
            form.noDueDate ? null : form.dueDate,
            task.projectDeadline
        );
        if (rangeError) {
            setActionError(rangeError);
            return;
        }

        setSaving(true);
        try {
            setActionError(null);
            const updated = await updateTask(code, taskId, {
                title: form.title.trim(),
                description: form.description.trim() || null,
                columnId: form.columnId,
                priority: form.priority,
                startDate: form.noStartDate || !form.startDate
                    ? null
                    : new Date(form.startDate).toISOString(),
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
            startDate: task.startDate ? toLocalInputValue(task.startDate) : '',
            noStartDate: !task.startDate,
            dueDate: task.dueDate ? toLocalInputValue(task.dueDate) : '',
            noDueDate: !task.dueDate
        });
    };

    const handleDelete = async () => {
        if (isArchived) return;
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
        if (isArchived) return;
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
        if (isArchived) return;
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
        if (isArchived) return;
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
        if (isArchived) return;
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
        if (isArchived) return;
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
        if (isArchived) return;
        setEditingSubtaskId(subtask.id);
        setEditingSubtaskTitle(subtask.title);
    };

    const handleSaveSubtask = async (subtaskId) => {
        if (isArchived) return;
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
        if (isArchived) return;
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
    //  ТЕГИ
    // ═══════════════════════════════════════════════════════════

    const handleToggleTag = async (tagId) => {
        if (isArchived) return;
        if (!task.canEdit) return;

        const current = (task.tags || []).map(t => t.id);
        const next = current.includes(tagId)
            ? current.filter(id => id !== tagId)
            : [...current, tagId];

        if (next.length > 10) {
            setActionError('Нельзя привязать больше 10 тегов');
            return;
        }

        try {
            setActionError(null);
            const updated = await setTaskTags(code, taskId, next);
            setTask(updated);
        } catch (e) {
            console.error('❌ Ошибка установки тегов:', e);
            setActionError(e.message);
        }
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (isArchived) return;
        const name = newTagName.trim();
        if (!name || tagSubmitting) return;

        setTagSubmitting(true);
        try {
            setActionError(null);
            const newTag = await createTag(code, {
                name,
                color: newTagColor || null
            });

            setAllTags(prev =>
                [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
            );

            const current = (task.tags || []).map(t => t.id);
            if (current.length < 10) {
                const updated = await setTaskTags(code, taskId, [...current, newTag.id]);
                setTask(updated);
            }

            setNewTagName('');
            setNewTagColor('#4f46e5');
        } catch (e) {
            console.error('❌ Ошибка создания тега:', e);
            setActionError(e.message);
        } finally {
            setTagSubmitting(false);
        }
    };

    const handleDeleteTag = async (tag) => {
        if (isArchived) return;
        if (!task.isOwner) return;
        if (!window.confirm(`Удалить тег "${tag.name}" из проекта?`)) return;
        try {
            setActionError(null);
            await deleteTag(code, tag.id);
            setAllTags(prev => prev.filter(t => t.id !== tag.id));
            setTask(prev => ({
                ...prev,
                tags: (prev.tags || []).filter(t => t.id !== tag.id)
            }));
        } catch (e) {
            console.error('❌ Ошибка удаления тега:', e);
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
    const taskTags = task.tags || [];
    const emailLower = (user?.email || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const isTaken = assignees.length > 0;
    const isOwnerUser = !!task.isOwner;

    // 📦 Учитываем архив везде, где раньше было task.canEdit / isOwnerUser
    const canEdit = !isArchived && !!task.canEdit;
    const canUpload = !isArchived && !!task.canUploadAttachments;
    const canComment = !isArchived;
    const canDeleteTask = !isArchived && isOwnerUser;
    const canTake = !isArchived && !isMine;

    const priorityInfo = getPriorityInfo(task.priority);
    const deadlineStatus = getDeadlineStatus(task.effectiveDueDate, !!task.completedAt);

    return (
        <div className="task-details-page">
            <button className="btn-back" onClick={() => navigate(-1)}>
                ← Назад
            </button>

            {isArchived && (
                <div className="archive-banner">
                    📦 Этот проект в архиве. Задача доступна только для просмотра.
                </div>
            )}

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
                            {canEdit && (
                                <button
                                    className="btn-edit"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Редактировать
                                </button>
                            )}

                            {canComment && (
                                <button
                                    className="btn-comment"
                                    onClick={() => setShowCommentBox(v => !v)}
                                    title="Оставить комментарий"
                                >
                                    Комментировать
                                </button>
                            )}

                            {canDeleteTask && (
                                <button
                                    className="btn-delete-task"
                                    onClick={handleDelete}
                                    title="Удалить задачу"
                                >
                                    Удалить
                                </button>
                            )}

                            {canTake && (
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

                    {showCommentBox && canComment && (
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
                                <b>Начало:</b>{' '}
                                {task.startDate ? formatDateTime(task.startDate) : 'Не задано'}
                            </span>
                            <span>
                                <b>Дедлайн:</b>{' '}
                                {task.effectiveDueDate ? (
                                    <span className={deadlineStatus}>
                                        {formatDateTime(task.effectiveDueDate)}
                                        {!task.isDueDateFixed && ' (по проекту)'}
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

                                        const canRemove = !isArchived && (isOwnerUser || isSelf);

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

                        {/* ── Теги ── */}
                        <div className="task-details-tags">
                            <div className="tags-header">
                                <h3>Теги ({taskTags.length}/10)</h3>

                                {canEdit && (
                                    <button
                                        type="button"
                                        className="btn-toggle-tags"
                                        onClick={() => setShowTagPicker(v => !v)}
                                    >
                                        {showTagPicker ? 'Скрыть' : '🏷 Управлять тегами'}
                                    </button>
                                )}
                            </div>

                            {taskTags.length === 0 ? (
                                <p className="no-tags">Тегов пока нет</p>
                            ) : (
                                <div className="task-tags-list">
                                    {taskTags.map(t => (
                                        <span
                                            key={t.id}
                                            className="task-tag-chip"
                                            style={{
                                                backgroundColor: t.color ? `${t.color}22` : '#eef2ff',
                                                color: t.color || '#4f46e5',
                                                borderColor: t.color || '#c7d2fe'
                                            }}
                                        >
                                            {t.name}
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    className="task-tag-remove"
                                                    title="Снять тег"
                                                    onClick={() => handleToggleTag(t.id)}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {showTagPicker && canEdit && (
                                <div className="tags-picker">
                                    <div className="tags-picker-list">
                                        {allTags.length === 0 ? (
                                            <p className="no-tags-available">
                                                В проекте ещё нет тегов
                                            </p>
                                        ) : (
                                            allTags.map(t => {
                                                const isChecked = taskTags.some(tt => tt.id === t.id);
                                                return (
                                                    <label
                                                        key={t.id}
                                                        className={`tag-picker-item ${isChecked ? 'checked' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleTag(t.id)}
                                                        />
                                                        <span
                                                            className="tag-picker-dot"
                                                            style={{ backgroundColor: t.color || '#9ca3af' }}
                                                        />
                                                        <span className="tag-picker-name">{t.name}</span>
                                                        <span className="tag-picker-count">
                                                            {t.tasksCount} задач
                                                        </span>
                                                        {task.isOwner && !isArchived && (
                                                            <button
                                                                type="button"
                                                                className="tag-picker-delete"
                                                                title="Удалить тег из проекта"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleDeleteTag(t);
                                                                }}
                                                            >
                                                                🗑
                                                            </button>
                                                        )}
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>

                                    <form className="tag-create-form" onSubmit={handleCreateTag}>
                                        <input
                                            type="color"
                                            value={newTagColor}
                                            onChange={e => setNewTagColor(e.target.value)}
                                            title="Цвет тега"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Новый тег…"
                                            value={newTagName}
                                            onChange={e => setNewTagName(e.target.value)}
                                            maxLength={50}
                                            disabled={tagSubmitting}
                                        />
                                        <button
                                            type="submit"
                                            disabled={tagSubmitting || !newTagName.trim()}
                                        >
                                            {tagSubmitting ? '…' : '+ Создать'}
                                        </button>
                                    </form>
                                </div>
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
                                                disabled={!canEdit || subtaskBusyId === s.id}
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
                                                        canEdit && handleStartEditSubtask(s)
                                                    }
                                                    title={canEdit ? 'Двойной клик — редактировать' : ''}
                                                >
                                                    {s.title}
                                                </span>
                                            )}

                                            {canEdit && editingSubtaskId !== s.id && (
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

                            {canEdit && (
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

                                {canUpload && (
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
                                            {att.canDelete && !isArchived && (
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

                    {/* ── Дата начала ── */}
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={form.noStartDate}
                                onChange={e => setForm({
                                    ...form,
                                    noStartDate: e.target.checked,
                                    startDate: e.target.checked ? '' : form.startDate
                                })}
                            />
                            Без даты начала
                        </label>

                        {!form.noStartDate && (
                            <label>
                                Дата начала
                                <input
                                    type="datetime-local"
                                    value={form.startDate}
                                    max={
                                        task.projectDeadline &&
                                            new Date(task.projectDeadline) > new Date()
                                            ? toLocalInputValue(task.projectDeadline)
                                            : undefined
                                    }
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
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

                    {/* ── Дедлайн ── */}
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
                            Без дедлайна (до конца проекта)
                        </label>

                        {!form.noDueDate && (
                            <label>
                                Дедлайн задачи
                                <input
                                    type="datetime-local"
                                    value={form.dueDate}
                                    max={
                                        task.projectDeadline &&
                                            new Date(task.projectDeadline) > new Date()
                                            ? toLocalInputValue(task.projectDeadline)
                                            : undefined
                                    }
                                    min={
                                        !form.noStartDate && form.startDate
                                            ? form.startDate
                                            : undefined
                                    }
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