// src/components/CreateProjectForm.js
import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../utils/constants';
import '../styles/components/CreateProjectForm.css';

const CreateProjectForm = ({ onSubmit, loading, onCancel, resetForm }) => {
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        category: 1,
        visibility: 1,
        deadline: new Date().toISOString()
    });

    // 🆕 Сброс формы при успешном создании
    useEffect(() => {
        if (resetForm) {
            resetFormData();
        }
    }, [resetForm]);

    const resetFormData = () => {
        setNewProject({
            name: '',
            description: '',
            category: 0,
            visibility: 1,
            deadline: new Date().toISOString()
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewProject(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(newProject);
        // ❌ Не сбрасываем здесь, сброс происходит через resetForm из App
    };

    return (
        <form onSubmit={handleSubmit} className="create-form">
            <h3>📝 Новый проект</h3>

            <div className="form-group">
                <label>Название *</label>
                <input
                    type="text"
                    name="name"
                    value={newProject.name}
                    onChange={handleChange}
                    required
                    placeholder="Введите название проекта"
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label>Описание</label>
                <textarea
                    name="description"
                    value={newProject.description}
                    onChange={handleChange}
                    placeholder="Описание проекта"
                    rows="3"
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label>Категория</label>
                <select
                    name="category"
                    value={newProject.category}
                    onChange={handleChange}
                    disabled={loading}
                >
                    {Object.entries(CATEGORIES).map(([value, label]) => (
                        <option key={value} value={parseInt(value)}>{label}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label>Видимость</label>
                <select
                    name="visibility"
                    value={newProject.visibility}
                    onChange={handleChange}
                    disabled={loading}
                >
                    <option value="1">🌍 Публичный</option>
                    <option value="0">🔒 Приватный</option>
                </select>
            </div>

            <div className="form-group">
                <label>Дедлайн</label>
                <input
                    type="datetime-local"
                    name="deadline"
                    value={newProject.deadline.slice(0, 16)}
                    onChange={handleChange}
                    disabled={loading}
                />
            </div>

            <div className="form-actions">
                <button type="submit" className="btn btn-submit" disabled={loading}>
                    {loading ? '⏳ Создание...' : '✅ Создать проект'}
                </button>
                <button type="button" className="btn btn-cancel" onClick={onCancel} disabled={loading}>
                    ✖️ Отмена
                </button>
            </div>
        </form>
    );
};

export default CreateProjectForm;