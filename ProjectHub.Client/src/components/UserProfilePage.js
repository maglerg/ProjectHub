// projecthub.client/src/components/UserProfilePage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfileByEmail } from '../services/userApi';
import '../styles/components/UserProfilePage.css';

const UserProfilePage = () => {
    const { email } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadUserProfile();
    }, [email]);

    const loadUserProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const decodedEmail = decodeURIComponent(email);
            console.log('Загрузка профиля для email:', decodedEmail);
            const data = await getUserProfileByEmail(decodedEmail);
            console.log('Данные пользователя:', data);
            setUser(data);
        } catch (err) {
            setError(err.message || 'Не удалось загрузить профиль пользователя');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = () => {
        // TODO: реализовать отправку сообщений
        alert(`💬 Отправить сообщение пользователю ${user?.name}`);
    };

    if (loading) {
        return (
            <div className="user-profile-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка профиля...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-profile-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-profile-not-found">
                <div className="not-found-icon">👤</div>
                <h3>Пользователь не найден</h3>
                <p>Возможно, пользователь был удален</p>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
            </div>
        );
    }

    return (
        <div className="user-profile-page">
            <header className="user-profile-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
                <h1>👤 Профиль пользователя</h1>
            </header>

            <div className="user-profile-content">
                <div className="user-profile-card">
                    <div className="user-profile-avatar">
                        {user.name ? user.name[0].toUpperCase() : '👤'}
                    </div>

                    <div className="user-profile-info">
                        <div className="info-row">
                            <span className="info-label">Имя</span>
                            <span className="info-value">{user.name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Email</span>
                            <span className="info-value">{user.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Специализация</span>
                            <span className="info-value">{user.specialization || 'Не указана'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Статус</span>
                            <span className={`user-status ${user.isOnline ? 'online' : 'offline'}`}>
                                {user.isOnline ? '🟢 Онлайн' : '⚫ Оффлайн'}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">На сайте с</span>
                            <span className="info-value">
                                {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>

                    {user.description && (
                        <div className="user-profile-description">
                            <h3>📝 О себе</h3>
                            <p>{user.description}</p>
                        </div>
                    )}

                    <div className="user-profile-stats">
                        <div className="stat-card">
                            <span className="stat-number">{user.projectsCount || 0}</span>
                            <span className="stat-label">Проектов</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-number">{user.completedProjectsCount || 0}</span>
                            <span className="stat-label">Завершено</span>
                        </div>
                    </div>

                    <div className="user-profile-actions">
                        <button className="btn-send-message" onClick={handleSendMessage}>
                            💬 Отправить сообщение
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;