// projecthub.client/src/components/EditProjectModal.js

import React, { useState, useEffect, useRef } from 'react';
import {
    Pencil,
    X,
    Image as ImageIcon,
    Upload,
    Trash2,
    Tag as TagIcon,
    Lock,
    Loader2,
    Save,
    AlertCircle,
    Check,
} from 'lucide-react';
import {
    PROJECT_CATEGORIES,
    PROJECT_VISIBILITY,
    PROJECT_STATUSES
} from '../utils/constants';
import { updateProject } from '../services/projectsApi';
import {
    getProjectTags as getProjectTagsApi,
    setProjectTags as setProjectTagsApi
} from '../services/projectTagsApi';
import {
    uploadProjectCover,
    deleteProjectCover
} from '../services/projectCoverApi';
import ProjectTagPicker from './ProjectTagPicker';
import ProjectCover from './ProjectCover';
import '../styles/components/EditProjectModal.css';

const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 МБ
const ALLOWED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const EditProjectModal = ({ project, onClose, onUpdated, userRole }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        visibility: '',
        status: '',
        deadline: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // 🆕 Теги проекта
    const [projectTags, setProjectTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [tagsLoading, setTagsLoading] = useState(false);

    // 🆕 Обложка проекта
    const [coverUrl, setCoverUrl] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverError, setCoverError] = useState(null);
    const fileInputRef = useRef(null);

    // 📌 Что может редактировать пользователь
    const canEdit = {
        name: userRole === 'Owner',
        category: userRole === 'Owner',
        visibility: userRole === 'Owner',
        status: userRole === 'Owner',
        deadline: userRole === 'Owner',
        description: userRole === 'Owner' || userRole === 'Admin',
        tags: userRole === 'Owner',
        cover: userRole === 'Owner'    // 🆕 только владелец
    };

    // 📌 Форма
    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                description: project.description || '',
                category: project.category || '',
                visibility: project.visibility || 'Public',
                status: project.status || 'Uncompleted',
                deadline: project.deadline
                    ? new Date(project.deadline).toISOString().split('T')[0]
                    : ''
            });
            setCoverUrl(project.coverImageUrl || '');
        }
    }, [project]);

    // 🆕 Загрузка тегов проекта (только для владельца)
    useEffect(() => {
        if (!project?.publicCode || !canEdit.tags) return;

        let cancelled = false;

        (async () => {
            setTagsLoading(true);
            try {
                const tags = await getProjectTagsApi(project.publicCode);
                if (cancelled) return;
                setProjectTags(tags || []);
                setSelectedTagIds((tags || []).map(t => t.id));
            } catch (err) {
                console.warn('Не удалось загрузить теги проекта:', err);
                if (!cancelled) {
                    setProjectTags([]);
                    setSelectedTagIds([]);
                }
            } finally {
                if (!cancelled) setTagsLoading(false);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.publicCode, canEdit.tags]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 🆕 ── Загрузка обложки ──
    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCoverError(null);

        // Валидация размера
        if (file.size > MAX_COVER_SIZE) {
            setCoverError(`Файл больше ${MAX_COVER_SIZE / 1024 / 1024} МБ`);
            e.target.value = '';
            return;
        }

        // Валидация типа
        if (!ALLOWED_COVER_TYPES.includes(file.type)) {
            setCoverError('Допустимы только PNG, JPG, GIF, WEBP');
            e.target.value = '';
            return;
        }

        setUploadingCover(true);
        try {
            const updated = await uploadProjectCover(project.publicCode, file);

            // updated — ProjectResponse с новым coverImageUrl
            setCoverUrl(updated.coverImageUrl || '');

            // Тут же сообщаем родителю, чтобы он подтянул изменения,
            // если хочет. Но не закрываем модалку.
            if (onUpdated) onUpdated();

            setSuccess('✅ Обложка обновлена');
            setTimeout(() => setSuccess(null), 2500);
        } catch (err) {
            console.error('❌ Ошибка загрузки обложки:', err);
            setCoverError(err.message || 'Не удалось загрузить обложку');
        } finally {
            setUploadingCover(false);
            e.target.value = '';
        }
    };

    // 🆕 ── Удаление обложки ──
    const handleCoverDelete = async () => {
        if (!project?.publicCode) return;
        if (!coverUrl) return;

        if (!window.confirm('Удалить обложку проекта?')) return;

        setCoverError(null);
        setUploadingCover(true);
        try {
            const updated = await deleteProjectCover(project.publicCode);
            setCoverUrl(updated.coverImageUrl || '');

            if (onUpdated) onUpdated();

            setSuccess('✅ Обложка удалена');
            setTimeout(() => setSuccess(null), 2500);
        } catch (err) {
            console.error('❌ Ошибка удаления обложки:', err);
            setCoverError(err.message || 'Не удалось удалить обложку');
        } finally {
            setUploadingCover(false);
        }
    };

    // 🆕 Сохранение: сначала updateProject, потом setProjectTags (если нужно)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const updateData = {};
            if (canEdit.name) updateData.name = formData.name;
            if (canEdit.description) updateData.description = formData.description;
            if (canEdit.category) updateData.category = formData.category;
            if (canEdit.visibility) updateData.visibility = formData.visibility;
            if (canEdit.status) updateData.status = formData.status;
            if (canEdit.deadline)
                updateData.deadline = new Date(formData.deadline).toISOString();

            // 1. Обновление базовых полей проекта
            await updateProject(project.publicCode, updateData);

            // 2. Обновление тегов (только владелец)
            if (canEdit.tags) {
                const initialIds = projectTags.map(t => t.id).sort();
                const currentIds = [...selectedTagIds].sort();

                const changed =
                    initialIds.length !== currentIds.length ||
                    initialIds.some((id, i) => id !== currentIds[i]);

                if (changed) {
                    await setProjectTagsApi(project.publicCode, selectedTagIds);
                }
            }

            setSuccess('✅ Проект успешно обновлён!');
            setTimeout(() => {
                if (onUpdated) onUpdated();
                onClose();
            }, 1000);
        } catch (err) {
            setError(err.message || 'Ошибка обновления проекта');
        } finally {
            setLoading(false);
        }
    };

    const getFieldDisabled = (field) => !canEdit[field] || loading;

    const getFieldHint = (field) => {
        if (!canEdit[field]) {
            if (field === 'description')
                return 'Только владелец и администратор могут редактировать описание';
            if (field === 'tags')
                return 'Только владелец может управлять тегами проекта';
            if (field === 'cover')
                return 'Только владелец может менять обложку проекта';
            return 'Только владелец может редактировать это поле';
        }
        return null;
    };

    return (
        <div className="edit-modal-overlay" onClick={onClose}>
            <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="edit-modal-header">
                    <h2>
                        <Pencil size={20} />
                        Редактировать проект
                    </h2>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>

                {error && (
                    <div className="edit-modal-error">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="edit-modal-success">
                        <Check size={14} />
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="edit-modal-form">

                    {/* 🆕 ── ОБЛОЖКА ПРОЕКТА ── */}
                    <div className="form-group edit-modal-cover-group">
                        <label>
                            <ImageIcon size={16} />
                            Обложка проекта
                        </label>

                        <div className="edit-modal-cover">
                            <ProjectCover
                                coverImageUrl={coverUrl}
                                name={formData.name || project?.name}
                                publicCode={project?.publicCode}
                                size="lg"
                            />

                            {canEdit.cover && (
                                <div className="edit-modal-cover-actions">
                                    <label className="btn btn--secondary btn--sm edit-modal-cover-upload">
                                        {uploadingCover ? (
                                            <>
                                                <Loader2 size={14} className="icon-spin" />
                                                Загрузка…
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={14} />
                                                Заменить
                                            </>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/gif,image/webp"
                                            style={{ display: 'none' }}
                                            onChange={handleCoverUpload}
                                            disabled={uploadingCover || loading}
                                        />
                                    </label>

                                    {coverUrl && (
                                        <button
                                            type="button"
                                            className="btn btn--danger-outline btn--sm"
                                            onClick={handleCoverDelete}
                                            disabled={uploadingCover || loading}
                                            title="Удалить обложку"
                                        >
                                            <Trash2 size={14} />
                                            Удалить
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {coverError && (
                            <div className="edit-modal-cover-error">
                                <AlertCircle size={14} />
                                {coverError}
                            </div>
                        )}

                        {getFieldHint('cover') ? (
                            <span className="field-hint">
                                <Lock size={12} />
                                {getFieldHint('cover')}
                            </span>
                        ) : (
                            <span className="field-hint">
                                <ImageIcon size={12} />
                                PNG, JPG, GIF или WEBP до 5 МБ. Не обязательно.
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Название проекта</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={getFieldDisabled('name')}
                            className={!canEdit.name ? 'field-disabled' : ''}
                        />
                        {getFieldHint('name') && (
                            <span className="field-hint">
                                <Lock size={12} />
                                {getFieldHint('name')}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Описание</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={getFieldDisabled('description')}
                            rows="4"
                            className={!canEdit.description ? 'field-disabled' : ''}
                        />
                        {getFieldHint('description') && (
                            <span className="field-hint">
                                <Pencil size={12} />
                                {getFieldHint('description')}
                            </span>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Категория</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                disabled={getFieldDisabled('category')}
                                className={!canEdit.category ? 'field-disabled' : ''}
                            >
                                {PROJECT_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            {getFieldHint('category') && (
                                <span className="field-hint">
                                    <Lock size={12} />
                                    {getFieldHint('category')}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Видимость</label>
                            <select
                                name="visibility"
                                value={formData.visibility}
                                onChange={handleChange}
                                disabled={getFieldDisabled('visibility')}
                                className={!canEdit.visibility ? 'field-disabled' : ''}
                            >
                                {PROJECT_VISIBILITY.map(vis => (
                                    <option key={vis.value} value={vis.value}>
                                        {vis.label}
                                    </option>
                                ))}
                            </select>
                            {getFieldHint('visibility') && (
                                <span className="field-hint">
                                    <Lock size={12} />
                                    {getFieldHint('visibility')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Статус проекта</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                disabled={getFieldDisabled('status')}
                                className={!canEdit.status ? 'field-disabled' : ''}
                            >
                                {PROJECT_STATUSES.map(st => (
                                    <option key={st.value} value={st.value}>
                                        {st.label}
                                    </option>
                                ))}
                            </select>
                            {getFieldHint('status') && (
                                <span className="field-hint">
                                    <Lock size={12} />
                                    {getFieldHint('status')}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Дедлайн</label>
                            <input
                                type="date"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleChange}
                                disabled={getFieldDisabled('deadline')}
                                className={!canEdit.deadline ? 'field-disabled' : ''}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            {getFieldHint('deadline') && (
                                <span className="field-hint">
                                    <Lock size={12} />
                                    {getFieldHint('deadline')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Теги проекта (только владелец) ── */}
                    {canEdit.tags && (
                        <div className="form-group edit-modal-tags-group">
                            <label>
                                <TagIcon size={16} />
                                Теги проекта
                            </label>

                            {tagsLoading ? (
                                <div className="edit-modal-tags-loading">
                                    <Loader2 size={14} className="icon-spin" />
                                    Загрузка тегов…
                                </div>
                            ) : (
                                <ProjectTagPicker
                                    selectedTagIds={selectedTagIds}
                                    onChange={setSelectedTagIds}
                                    disabled={loading}
                                />
                            )}

                            <span className="field-hint">
                                <TagIcon size={12} />
                                Пользователи смогут найти проект по этим тегам
                            </span>
                        </div>
                    )}
                </form>

                <div className="edit-modal-footer">
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        onClick={handleSubmit}
                        disabled={loading || uploadingCover}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="icon-spin" />
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Сохранить
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProjectModal;