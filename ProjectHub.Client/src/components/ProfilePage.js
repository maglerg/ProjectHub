// projecthub.client/src/components/ProfilePage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUser, updateUser } from '../services/userApi';
import { SPECIALIZATIONS } from '../utils/constants';
import { getUser, setUser as setUserInStorage } from '../utils/storage';
import '../styles/components/ProfilePage.css';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, setUser, logout } = useAuth();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        specialization: '',
        description: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getCurrentUser();
            setProfile(data);
            setFormData({
                name: data.name || '',
                email: data.email || '',
                specialization: data.specialization || '',
                description: data.description || ''
            });
            setUserInStorage(data);
        } catch (err) {
            setError(err.message || 'Не удалось загрузить профиль');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const updated = await updateUser(formData);
            setUser(updated);
            setProfile(updated);
            setSuccess('✅ Профиль успешно обновлен!');
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Ошибка обновления профиля');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            name: profile?.name || '',
            email: profile?.email || '',
            specialization: profile?.specialization || '',
            description: profile?.description || ''
        });
        setError(null);
        setSuccess(null);
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка профиля...</p>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="profile-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <header className="profile-header">
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Назад
                </button>
                <h1>👤 Профиль пользователя</h1>
                <div className="header-actions">
                    {!isEditing ? (
                        <button
                            className="btn-edit-profile"
                            onClick={() => setIsEditing(true)}
                        >
                            ✏️ Редактировать
                        </button>
                    ) : (
                        <button
                            className="btn-cancel-edit"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Отмена
                        </button>
                    )}
                    <button className="btn-logout" onClick={logout}>
                        🚪 Выйти
                    </button>
                </div>
            </header>

            <div className="profile-content">
                {success && (
                    <div className="success-message">{success}</div>
                )}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                <div className="profile-card">
                    <div className="profile-avatar">
                        {formData.name ? formData.name[0].toUpperCase() : '👤'}
                    </div>

                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label>Имя</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={!isEditing || saving}
                                placeholder="Ваше имя"
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={true}
                                className="disabled-field"
                            />
                            <span className="field-hint">Email нельзя изменить</span>
                        </div>

                        <div className="form-group">
                            <label>Специализация</label>
                            <select
                                name="specialization"
                                value={formData.specialization}
                                onChange={handleChange}
                                disabled={!isEditing || saving}
                            >
                                {SPECIALIZATIONS.map(spec => (
                                    <option key={spec.value} value={spec.value}>
                                        {spec.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>О себе</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                disabled={!isEditing || saving}
                                placeholder="Расскажите о своем опыте, навыках, интересах..."
                                rows="4"
                            />
                        </div>

                        {isEditing && (
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn-save"
                                    disabled={saving}
                                >
                                    {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <div className="profile-stats">
                    <div className="stat-card">
                        <span className="stat-number">{profile?.projectsCount || 0}</span>
                        <span className="stat-label">Проектов</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">{profile?.completedProjectsCount || 0}</span>
                        <span className="stat-label">Завершено</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">{profile?.isOnline ? '🟢' : '⚫'}</span>
                        <span className="stat-label">{profile?.isOnline ? 'Онлайн' : 'Оффлайн'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;