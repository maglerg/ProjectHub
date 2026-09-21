// projecthub.client/src/components/EditProjectModal.js

import React, { useState, useEffect } from 'react';
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
import ProjectTagPicker from './ProjectTagPicker';
import '../styles/components/EditProjectModal.css';

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

    // 📌 Что может редактировать пользователь
    const canEdit = {
        name: userRole === 'Owner',
        category: userRole === 'Owner',
        visibility: userRole === 'Owner',
        status: userRole === 'Owner',
        deadline: userRole === 'Owner',
        description: userRole === 'Owner' || userRole === 'Admin',
        tags: userRole === 'Owner'   // 🆕 только владелец
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
                return '✏️ Только владелец и администратор могут редактировать описание';
            if (field === 'tags')
                return '🔒 Только владелец может управлять тегами проекта';
            return '🔒 Только владелец может редактировать это поле';
        }
        return null;
    };

    return (
        <div className="edit-modal-overlay" onClick={onClose}>
            <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="edit-modal-header">
                    <h2>✏️ Редактировать проект</h2>
                    <button className="edit-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && <div className="edit-modal-error">{error}</div>}
                {success && <div className="edit-modal-success">{success}</div>}

                <form onSubmit={handleSubmit} className="edit-modal-form">
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
                            <span className="field-hint">{getFieldHint('name')}</span>
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
                            <span className="field-hint">{getFieldHint('description')}</span>
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
                                <span className="field-hint">{getFieldHint('category')}</span>
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
                                <span className="field-hint">{getFieldHint('visibility')}</span>
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
                                <span className="field-hint">{getFieldHint('status')}</span>
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
                                <span className="field-hint">{getFieldHint('deadline')}</span>
                            )}
                        </div>
                    </div>

                    {/* 🆕 ── Теги проекта (только владелец) ── */}
                    {canEdit.tags && (
                        <div className="form-group edit-modal-tags-group">
                            <label>🏷️ Теги проекта</label>

                            {tagsLoading ? (
                                <div className="edit-modal-tags-loading">
                                    ⏳ Загрузка тегов…
                                </div>
                            ) : (
                                <ProjectTagPicker
                                    selectedTagIds={selectedTagIds}
                                    onChange={setSelectedTagIds}
                                    disabled={loading}
                                />
                            )}

                            <span className="field-hint">
                                🏷️ Пользователи смогут найти проект по этим тегам
                            </span>
                        </div>
                    )}
                </form>

                <div className="edit-modal-footer">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className="btn-save"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? '⏳ Сохранение...' : '💾 Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProjectModal;