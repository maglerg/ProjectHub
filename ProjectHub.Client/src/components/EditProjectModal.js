// projecthub.client/src/components/EditProjectModal.js

import React, { useState, useEffect } from 'react';
import { PROJECT_CATEGORIES, PROJECT_VISIBILITY } from '../utils/constants';
import { updateProject } from '../services/projectsApi';
import '../styles/components/EditProjectModal.css';

const EditProjectModal = ({ project, onClose, onUpdated, userRole }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        visibility: '',
        deadline: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // 📌 Определяем, что может редактировать пользователь
    const canEdit = {
        name: userRole === 'Owner',
        category: userRole === 'Owner',
        visibility: userRole === 'Owner',
        deadline: userRole === 'Owner',
        description: userRole === 'Owner' || userRole === 'Admin'
    };

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || '',
                description: project.description || '',
                category: project.category || '',
                visibility: project.visibility || 'Public',
                deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
            });
        }
    }, [project]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Формируем данные для отправки (только те поля, которые можно редактировать)
            const updateData = {};
            if (canEdit.name) updateData.name = formData.name;
            if (canEdit.description) updateData.description = formData.description;
            if (canEdit.category) updateData.category = formData.category;
            if (canEdit.visibility) updateData.visibility = formData.visibility;
            if (canEdit.deadline) updateData.deadline = new Date(formData.deadline).toISOString();

            await updateProject(project.publicCode, updateData);
            setSuccess('✅ Проект успешно обновлен!');
            setTimeout(() => {
                if (onUpdated) onUpdated();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.message || 'Ошибка обновления проекта');
        } finally {
            setLoading(false);
        }
    };

    const getFieldDisabled = (field) => {
        return !canEdit[field] || loading;
    };

    const getFieldHint = (field) => {
        if (!canEdit[field]) {
            if (field === 'description') return '✏️ Только владелец и администратор могут редактировать описание';
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

                {error && (
                    <div className="edit-modal-error">{error}</div>
                )}
                {success && (
                    <div className="edit-modal-success">{success}</div>
                )}

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

                    <div className="edit-modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? '⏳ Сохранение...' : '💾 Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProjectModal;