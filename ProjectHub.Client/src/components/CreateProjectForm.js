// src/components/CreateProjectForm.js
import React, { useState } from 'react';
import { CATEGORIES } from '../utils/constants';
import '../styles/components/CreateProjectForm.css';

const CreateProjectForm = ({ onSubmit, loading, onCancel }) => {
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        category: 0,
        visibility: 1,
        deadline: new Date().toISOString()
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewProject(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(newProject);
    };

    return (
        <form onSubmit={handleSubmit} className="create-form">
            <h3>Новый проект</h3>

            <div className="form-group">
                <label>Название *</label>
                <input
                    type="text"
                    name="name"
                    value={newProject.name}
                    onChange={handleChange}
                    required
                    placeholder="Введите название проекта"
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
                />
            </div>

            <div className="form-group">
                <label>Категория</label>
                <select
                    name="category"
                    value={newProject.category}
                    onChange={handleChange}
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
                >
                    <option value="1">Публичный</option>
                    <option value="0">Приватный</option>
                </select>
            </div>

            <div className="form-group">
                <label>Дедлайн</label>
                <input
                    type="datetime-local"
                    name="deadline"
                    value={newProject.deadline.slice(0, 16)}
                    onChange={handleChange}
                />
            </div>

            <div className="form-actions">
                <button type="submit" className="btn btn-submit" disabled={loading}>
                    {loading ? '⏳ Создание...' : '✅ Создать проект'}
                </button>
                <button type="button" className="btn btn-cancel" onClick={onCancel}>
                    ✖️ Отмена
                </button>
            </div>
        </form>
    );
};

export default CreateProjectForm;