// projecthub.client/src/components/tasks/TaskDetailsPage.js

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Archive,
    X,
    Pencil,
    MessageCircle,
    Trash2,
    UserPlus,
    Tag as TagIcon,
    FileText,
    Paperclip,
    Loader2,
    AlertTriangle,
    Plus,
    Check,
} from 'lucide-react';
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
import { signalr } from '../../services/signalrService';
import { useAuth } from '../../context/AuthContext';
import TaskComments from './TaskComments';
import '../../styles/components/tasks/tasks.css';

export default function TaskDetailsPage() {
    const { code, taskId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const startInEditMode = searchParams.get('edit') === '1';

    // ── Основное состояние ──
    const [task, setTask] = useState(null);
    const [project, setProject] = useState(null);
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

    const commentsRef = useRef(null);

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

    // 🆕 Refs — чтобы обработчики SignalR видели актуальное
    const taskIdRef = useRef(taskId);
    useEffect(() => { taskIdRef.current = taskId; }, [taskId]);

    // ═══════════════════════════════════════════════════════════
    //  ЗАГРУЗКА
    // ═══════════════════════════════════════════════════════════

    const loadAll = useCallback(async () => {
        if (!code || !taskId) return;
        setLoading(true);
        setError(null);
        try {
            const [taskData, board, tagsData, projectData] = await Promise.all([
                getTaskById(code, taskId),
                getTasksBoard(code),
                getProjectTags(code),
                searchMyProjectByCode(code)
            ]);
            setTask(taskData);
            setColumns(board);
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

            if (startInEditMode && !projectData?.isArchived) {
                setIsEditing(true);
            }
        } catch (e) {
            console.error('❌ Ошибка загрузки задачи:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [code, taskId, startInEditMode]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const isArchived = !!project?.isArchived;

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: JoinProject + обработчики, релевантные задаче
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!code || !taskId) return;

        let cancelled = false;

        // ── Изменение самой задачи (кто-то другой её отредактировал) ──
        const handleTaskUpdated = (updated) => {
            if (updated?.id !== taskIdRef.current) return;
            setTask((prev) => prev ? { ...prev, ...updated } : updated);
        };

        const handleTaskMoved = (payload) => {
            const updated = payload?.task;
            if (updated?.id !== taskIdRef.current) return;
            setTask((prev) => prev ? { ...prev, ...updated } : updated);
        };

        const handleTaskTaken = (updated) => {
            if (updated?.id !== taskIdRef.current) return;
            setTask((prev) => prev ? { ...prev, ...updated } : updated);
        };

        const handleTaskLeft = (updated) => {
            if (updated?.id !== taskIdRef.current) return;
            setTask((prev) => prev ? { ...prev, ...updated } : updated);
        };

        // Если задачу удалили — уходим на дашборд
        const handleTaskDeleted = (payload) => {
            const deletedId = payload?.taskId;
            if (deletedId !== taskIdRef.current) return;
            setActionError('Эта задача была удалена');
            setTimeout(() => {
                navigate(`/projects/${code}/dashboard`);
            }, 1500);
        };

        // ── Подзадачи — обновляем task целиком (мог поменяться columnId) ──
        const handleSubtaskChanged = (payload) => {
            const updated = payload?.task;
            if (!updated) return;
            if (updated.id !== taskIdRef.current) return;
            setTask((prev) => prev ? { ...prev, ...updated } : updated);
        };

        // ── Теги задачи ──
        const handleTaskTagsUpdated = (updated) => {
            if (updated?.id !== taskIdRef.current) return;
            setTask((prev) => prev ? { ...prev, ...updated } : updated);
        };

        // ── Теги проекта (создание/удаление) — обновляем allTags ──
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
            setTask((prev) =>
                prev
                    ? { ...prev, tags: (prev.tags || []).filter((t) => t.id !== tagId) }
                    : prev
            );
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing task…');
            signalr.invoke('JoinProject', code).catch(() => { });
            loadAll();
        };

        signalr.on('TaskUpdated', handleTaskUpdated);
        signalr.on('TaskMoved', handleTaskMoved);
        signalr.on('TaskTaken', handleTaskTaken);
        signalr.on('TaskLeft', handleTaskLeft);
        signalr.on('TaskDeleted', handleTaskDeleted);
        signalr.on('SubtaskAdded', handleSubtaskChanged);
        signalr.on('SubtaskDeleted', handleSubtaskChanged);
        signalr.on('TaskTagsUpdated', handleTaskTagsUpdated);
        signalr.on('TaskTagCreated', handleTaskTagCreated);
        signalr.on('TaskTagDeleted', handleTaskTagDeleted);
        signalr.on('_reconnected', handleReconnected);

        (async () => {
            try {
                await signalr.connect();
                if (cancelled) return;
                await signalr.invoke('JoinProject', code);
            } catch (err) {
                console.warn('Не удалось присоединиться к SignalR-проекту:', err);
            }
        })();

        return () => {
            cancelled = true;

            signalr.off('TaskUpdated', handleTaskUpdated);
            signalr.off('TaskMoved', handleTaskMoved);
            signalr.off('TaskTaken', handleTaskTaken);
            signalr.off('TaskLeft', handleTaskLeft);
            signalr.off('TaskDeleted', handleTaskDeleted);
            signalr.off('SubtaskAdded', handleSubtaskChanged);
            signalr.off('SubtaskDeleted', handleSubtaskChanged);
            signalr.off('TaskTagsUpdated', handleTaskTagsUpdated);
            signalr.off('TaskTagCreated', handleTaskTagCreated);
            signalr.off('TaskTagDeleted', handleTaskTagDeleted);
            signalr.off('_reconnected', handleReconnected);

            signalr.invoke('LeaveProject', code).catch(() => { });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, taskId, loadAll, navigate]);

    // ═══════════════════════════════════════════════════════════
    //  ЗАДАЧА — ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════

    const handleTake = async () => {
        if (isArchived) return;
        try {
            setActionError(null);
            const updated = await takeTask(code, taskId);
            if (!signalr.isConnected()) {
                setTask(updated);
            }
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
            if (!signalr.isConnected()) {
                setTask(updated);
            }
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
            if (!signalr.isConnected()) {
                setTask(updated);
            }
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

    const scrollToComments = () => {
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

            if (!signalr.isConnected()) {
                setTask((prev) => ({
                    ...prev,
                    attachments: [...(prev.attachments || []), newAtt]
                }));
            }
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

            if (!signalr.isConnected()) {
                setTask((prev) => ({
                    ...prev,
                    attachments: (prev.attachments || []).filter((a) => a.id !== att.id)
                }));
            }
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

            if (!signalr.isConnected()) {
                setTask((prev) => {
                    const updated = {
                        ...prev,
                        subtasks: [...(prev.subtasks || []), newSubtask]
                    };
                    updated.hasSubtasks = updated.subtasks.length > 0;
                    updated.totalSubtasksCount = updated.subtasks.length;
                    updated.completedSubtasksCount = updated.subtasks.filter(
                        (s) => s.isCompleted
                    ).length;
                    return updated;
                });
            }

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
            if (!signalr.isConnected()) {
                setTask(updated);
            }
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

            if (!signalr.isConnected()) {
                setTask((prev) => ({
                    ...prev,
                    subtasks: prev.subtasks.map((s) =>
                        s.id === subtaskId ? updated : s
                    )
                }));
            }
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
            if (!signalr.isConnected()) {
                setTask(updated);
            }
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

        const current = (task.tags || []).map((t) => t.id);
        const next = current.includes(tagId)
            ? current.filter((id) => id !== tagId)
            : [...current, tagId];

        if (next.length > 10) {
            setActionError('Нельзя привязать больше 10 тегов');
            return;
        }

        try {
            setActionError(null);
            const updated = await setTaskTags(code, taskId, next);
            if (!signalr.isConnected()) {
                setTask(updated);
            }
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

            setAllTags((prev) =>
                [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
            );

            const current = (task.tags || []).map((t) => t.id);
            if (current.length < 10) {
                const updated = await setTaskTags(code, taskId, [...current, newTag.id]);
                if (!signalr.isConnected()) {
                    setTask(updated);
                }
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
            setAllTags((prev) => prev.filter((t) => t.id !== tag.id));
            setTask((prev) => ({
                ...prev,
                tags: (prev.tags || []).filter((t) => t.id !== tag.id)
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
        (a) => (a.email || '').toLowerCase() === emailLower
    );
    const isTaken = assignees.length > 0;
    const isOwnerUser = !!task.isOwner;

    const canEdit = !isArchived && !!task.canEdit;
    const canUpload = !isArchived && !!task.canUploadAttachments;
    const canComment = !isArchived;
    const canDeleteTask = !isArchived && isOwnerUser;
    const canTake = !isArchived && !isMine;

    const priorityInfo = getPriorityInfo(task.priority);
    const PriorityIcon = priorityInfo.lucideIcon;
    const deadlineStatus = getDeadlineStatus(task.effectiveDueDate, !!task.completedAt);

    return (
        <div className="task-details-page">
            <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft size={16} />
                Назад
            </button>

            {isArchived && (
                <div className="archive-banner">
                    <Archive size={16} />
                    Этот проект в архиве. Задача доступна только для просмотра.
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

            {!isEditing ? (
                <>
                    <header className="task-details-header">
                        <h1>
                            {task.priority && task.priority !== 'None' && PriorityIcon && (
                                <span
                                    className="task-priority-icon-lg"
                                    title={priorityInfo.label}
                                    style={{ color: priorityInfo.color }}
                                >
                                    <PriorityIcon size={20} />
                                </span>
                            )}
                            {task.title}
                        </h1>

                        <div className="task-details-actions">
                            {canEdit && (
                                <button
                                    type="button"
                                    className="btn btn--secondary"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Pencil size={16} />
                                    Редактировать
                                </button>
                            )}

                            {canComment && (
                                <button
                                    type="button"
                                    className="btn btn--secondary"
                                    onClick={scrollToComments}
                                    title="К комментариям"
                                >
                                    <MessageCircle size={16} />
                                    Комментировать
                                </button>
                            )}

                            {canDeleteTask && (
                                <button
                                    type="button"
                                    className="btn btn--danger-outline"
                                    onClick={handleDelete}
                                    title="Удалить задачу"
                                >
                                    <Trash2 size={16} />
                                    Удалить
                                </button>
                            )}

                            {canTake && (
                                <button
                                    type="button"
                                    className="btn btn--primary"
                                    onClick={handleTake}
                                    title={isTaken ? 'Присоединиться к задаче' : 'Взять задачу'}
                                >
                                    <UserPlus size={16} />
                                    {isTaken ? 'Присоединиться' : 'Взять задачу'}
                                </button>
                            )}
                        </div>
                    </header>

                    <section className="task-details-body">
                        <div className="task-details-meta">
                            <span><b>Блок:</b> {task.columnName}</span>
                            <span>
                                <b>Приоритет:</b>{' '}
                                {PriorityIcon && (
                                    <PriorityIcon
                                        size={14}
                                        style={{
                                            color: priorityInfo.color,
                                            display: 'inline',
                                            verticalAlign: 'middle',
                                            marginRight: 4,
                                        }}
                                    />
                                )}
                                {priorityInfo.label}
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
                                        {deadlineStatus === 'overdue' && (
                                            <>
                                                {' '}
                                                <AlertTriangle
                                                    size={14}
                                                    style={{ display: 'inline', verticalAlign: 'middle' }}
                                                />
                                            </>
                                        )}
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
                                                        type="button"
                                                        className="btn btn--ghost btn--icon btn--sm"
                                                        title={isSelf ? 'Снять задачу' : 'Снять исполнителя'}
                                                        onClick={() => handleRemoveAssignee(a.email)}
                                                        aria-label={isSelf ? 'Снять задачу' : 'Снять исполнителя'}
                                                    >
                                                        <X size={14} />
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
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => setShowTagPicker(v => !v)}
                                    >
                                        <TagIcon size={14} />
                                        {showTagPicker ? 'Скрыть' : 'Управлять тегами'}
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
                                                    className="btn btn--ghost btn--icon btn--sm task-tag-remove"
                                                    title="Снять тег"
                                                    onClick={() => handleToggleTag(t.id)}
                                                    aria-label="Снять тег"
                                                >
                                                    <X size={12} />
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
                                                                className="btn btn--ghost btn--icon btn--sm"
                                                                title="Удалить тег из проекта"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleDeleteTag(t);
                                                                }}
                                                                aria-label="Удалить тег из проекта"
                                                            >
                                                                <Trash2 size={14} />
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
                                            className="btn btn--primary btn--sm"
                                            disabled={tagSubmitting || !newTagName.trim()}
                                        >
                                            {tagSubmitting ? (
                                                <Loader2 size={14} className="icon-spin" />
                                            ) : (
                                                <>
                                                    <Plus size={14} />
                                                    Создать
                                                </>
                                            )}
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
                                                        className="btn btn--ghost btn--icon btn--sm"
                                                        title="Редактировать"
                                                        onClick={() => handleStartEditSubtask(s)}
                                                        aria-label="Редактировать подзадачу"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn--ghost btn--icon btn--sm"
                                                        title="Удалить"
                                                        onClick={() => handleDeleteSubtask(s)}
                                                        aria-label="Удалить подзадачу"
                                                    >
                                                        <X size={14} />
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
                                        className="btn btn--primary btn--sm"
                                        disabled={subtaskAdding || !newSubtaskTitle.trim()}
                                    >
                                        {subtaskAdding ? (
                                            <Loader2 size={14} className="icon-spin" />
                                        ) : (
                                            <>
                                                <Plus size={14} />
                                                Добавить
                                            </>
                                        )}
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
                                            className="btn btn--secondary btn--sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={14} className="icon-spin" />
                                                    Загрузка…
                                                </>
                                            ) : (
                                                <>
                                                    <Paperclip size={14} />
                                                    Прикрепить файл
                                                </>
                                            )}
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
                                            <span className="attachment-icon">
                                                <FileText size={18} />
                                            </span>
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
                                                    type="button"
                                                    className="btn btn--ghost btn--icon btn--sm"
                                                    title="Удалить файл"
                                                    onClick={() => handleDeleteFile(att)}
                                                    aria-label="Удалить файл"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* 🆕 ── Комментарии ── */}
                        <div ref={commentsRef}>
                            <TaskComments
                                projectCode={code}
                                taskId={taskId}
                                isArchived={isArchived}
                            />
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
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </label>

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
                            className="btn btn--secondary"
                            onClick={handleCancelEdit}
                            disabled={saving}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={saving || !form.title.trim()}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="icon-spin" />
                                    Сохранение…
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Сохранить
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}