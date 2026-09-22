// projecthub.client/src/components/CreateProjectForm.js

import React, { useState, useEffect } from 'react';
import { Loader2, Check, Plus } from 'lucide-react';
import { PROJECT_CATEGORIES, PROJECT_VISIBILITY } from '../utils/constants';
import '../styles/components/CreateProjectForm.css';

const CreateProjectForm = ({ onSubmit, loading, onCancel, resetForm }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Education',
        visibility: 'Public',
        deadline: ''
    });

    const [errors, setErrors] = useState({});

    // Сброс формы при resetForm = true
    useEffect(() => {
        if (resetForm) {
            setFormData({
                name: '',
                description: '',
                category: 'Web',
                visibility: 'Public',
                deadline: ''
            });
            setErrors({});
        }
    }, [resetForm]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Очищаем ошибку для этого поля
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Название проекта обязательно';
        } else if (formData.name.length < 3) {
            newErrors.name = 'Название должно содержать минимум 3 символа';
        } else if (formData.name.length > 255) {
            newErrors.name = 'Название не должно превышать 255 символов';
        }

        if (!formData.deadline) {
            newErrors.deadline = 'Укажите дедлайн проекта';
        } else {
            const deadlineDate = new Date(formData.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (deadlineDate < today) {
                newErrors.deadline = 'Дедлайн не может быть в прошлом';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        const submitData = {
            ...formData,
            deadline: new Date(formData.deadline).toISOString()
        };

        onSubmit(submitData);
    };

    return (
        <div className="create-project-form">
            <h2 className="create-project-form__title">Создать новый проект</h2>

            <form onSubmit={handleSubmit} className="create-project-form__body">
                <div className="form-group">
                    <label htmlFor="name" className="form-label">
                        Название проекта <span className="form-required">*</span>
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Введите название проекта"
                        disabled={loading}
                        className={`input ${errors.name ? 'input--error' : ''}`}
                    />
                    {errors.name && (
                        <span className="form-error-text">{errors.name}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="description" className="form-label">
                        Описание
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Опишите цели и задачи проекта"
                        rows="4"
                        disabled={loading}
                        className="input"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="category" className="form-label">
                            Категория <span className="form-required">*</span>
                        </label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            disabled={loading}
                            className="input"
                        >
                            {PROJECT_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="visibility" className="form-label">
                            Видимость <span className="form-required">*</span>
                        </label>
                        <select
                            id="visibility"
                            name="visibility"
                            value={formData.visibility}
                            onChange={handleChange}
                            disabled={loading}
                            className="input"
                        >
                            {PROJECT_VISIBILITY.map(vis => (
                                <option key={vis.value} value={vis.value}>
                                    {vis.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="deadline" className="form-label">
                        Дедлайн <span className="form-required">*</span>
                    </label>
                    <input
                        type="date"
                        id="deadline"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleChange}
                        disabled={loading}
                        className={`input ${errors.deadline ? 'input--error' : ''}`}
                        min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.deadline && (
                        <span className="form-error-text">{errors.deadline}</span>
                    )}
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn--secondary"
                        disabled={loading}
                    >
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="icon-spin" />
                                Создание…
                            </>
                        ) : (
                            <>
                                <Plus size={16} />
                                Создать проект
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProjectForm;