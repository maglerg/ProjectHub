// projecthub.client/src/components/ProfilePage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    ArrowLeft,
    Pencil,
    LogOut,
    Loader2,
    X,
    Camera,
    Trash2,
    Image as ImageIcon,
    Globe,
    Users,
    Info,
    Save,
    AlertCircle,
    Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCurrentUser, updateUser } from '../services/userApi';
import {
    uploadUserAvatar,
    deleteUserAvatar,
} from '../services/userAvatarApi';
import { SPECIALIZATIONS } from '../utils/constants';
import { setUser as setUserInStorage } from '../utils/storage';
import UserAvatar from './UserAvatar';
import '../styles/components/ProfilePage.css';

const MAX_AVATAR_SIZE = 3 * 1024 * 1024; // 3 МБ
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, setUser, logout } = useAuth();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Аватар
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        specialization: '',
        description: '',
        chatPrivacy: 'All',
    });

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                description: data.description || '',
                chatPrivacy: data.chatPrivacy || 'All',
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
            setUserInStorage(updated);
            setSuccess('✅ Профиль успешно обновлён!');
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
            description: profile?.description || '',
            chatPrivacy: profile?.chatPrivacy || 'All',
        });
        setError(null);
        setSuccess(null);
        setAvatarError(null);
    };

    // ── Загрузка аватара ──
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarError(null);

        if (file.size > MAX_AVATAR_SIZE) {
            setAvatarError(`Файл больше ${MAX_AVATAR_SIZE / 1024 / 1024} МБ`);
            e.target.value = '';
            return;
        }

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            setAvatarError('Допустимы только PNG, JPG, GIF, WEBP');
            e.target.value = '';
            return;
        }

        setUploadingAvatar(true);
        try {
            const updated = await uploadUserAvatar(file);

            setProfile(updated);
            if (setUser) setUser(updated);
            setUserInStorage(updated);

            setSuccess('✅ Аватар обновлён');
            setTimeout(() => setSuccess(null), 2500);
        } catch (err) {
            console.error('❌ Ошибка загрузки аватара:', err);
            setAvatarError(err.message || 'Не удалось загрузить аватар');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    // ── Удаление аватара ──
    const handleAvatarDelete = async () => {
        if (!profile?.avatarUrl) return;
        if (!window.confirm('Удалить аватар?')) return;

        setAvatarError(null);
        setUploadingAvatar(true);
        try {
            const updated = await deleteUserAvatar();

            setProfile(updated);
            if (setUser) setUser(updated);
            setUserInStorage(updated);

            setSuccess('✅ Аватар удалён');
            setTimeout(() => setSuccess(null), 2500);
        } catch (err) {
            console.error('❌ Ошибка удаления аватара:', err);
            setAvatarError(err.message || 'Не удалось удалить аватар');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-loading">
                <Loader2 size={32} className="icon-spin" />
                <p>Загрузка профиля…</p>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="profile-error">
                <div className="profile-state-icon">
                    <X size={28} />
                </div>
                <h3>Ошибка загрузки</h3>
                <p>{error}</p>
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Вернуться к проектам
                </button>
            </div>
        );
    }

    // Значение приватности для отображения
    const isFriendsOnly = formData.chatPrivacy === 'FriendsOnly';

    return (
        <div className="profile-page">
            <header className="profile-header">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>

                <h1>
                    <User size={22} />
                    Профиль пользователя
                </h1>

                <div className="header-actions">
                    {!isEditing ? (
                        <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <Pencil size={14} />
                            Редактировать
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Отмена
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn--danger-outline btn--sm"
                        onClick={logout}
                    >
                        <LogOut size={14} />
                        Выйти
                    </button>
                </div>
            </header>

            <div className="profile-content">
                {success && (
                    <div className="profile-notification success">
                        <Check size={14} />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="profile-notification error">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <div className="profile-card">
                    {/* ── АВАТАР ── */}
                    <div className="profile-avatar-section">
                        <UserAvatar
                            avatarUrl={profile?.avatarUrl}
                            name={formData.name || profile?.name}
                            email={profile?.email}
                            size="xl"
                        />

                        {isEditing && (
                            <div className="profile-avatar-actions">
                                <label className="btn btn--secondary btn--sm profile-avatar-upload">
                                    {uploadingAvatar ? (
                                        <>
                                            <Loader2 size={14} className="icon-spin" />
                                            Загрузка…
                                        </>
                                    ) : (
                                        <>
                                            <Camera size={14} />
                                            Сменить
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/gif,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarUpload}
                                        disabled={uploadingAvatar || saving}
                                    />
                                </label>

                                {profile?.avatarUrl && (
                                    <button
                                        type="button"
                                        className="btn btn--danger-outline btn--sm"
                                        onClick={handleAvatarDelete}
                                        disabled={uploadingAvatar || saving}
                                        title="Удалить аватар"
                                    >
                                        <Trash2 size={14} />
                                        Удалить
                                    </button>
                                )}
                            </div>
                        )}

                        {avatarError && (
                            <div className="profile-avatar-error">
                                <AlertCircle size={14} />
                                {avatarError}
                            </div>
                        )}

                        {isEditing && !avatarError && (
                            <span className="profile-avatar-hint">
                                <ImageIcon size={12} />
                                PNG, JPG, GIF или WEBP до 3 МБ
                            </span>
                        )}
                    </div>

                    {/* ── ФОРМА ── */}
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="profile-name">Имя</label>
                            <input
                                id="profile-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={!isEditing || saving}
                                placeholder="Ваше имя"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="profile-email">Email</label>
                            <input
                                id="profile-email"
                                type="email"
                                name="email"
                                value={formData.email}
                                disabled
                                className="disabled-field"
                            />
                            <span className="field-hint">Email нельзя изменить</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="profile-spec">Специализация</label>
                            <select
                                id="profile-spec"
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
                            <label htmlFor="profile-desc">О себе</label>
                            <textarea
                                id="profile-desc"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                disabled={!isEditing || saving}
                                placeholder="Расскажите о своём опыте, навыках, интересах…"
                                rows="4"
                            />
                        </div>

                        {/* 📌 КТО МОЖЕТ МНЕ ПИСАТЬ */}
                        <div className="privacy-group">
                            <label className="form-label-with-icon">
                                <Info size={16} />
                                Кто может мне писать
                            </label>

                            {isEditing ? (
                                /* ── Режим редактирования: 2 опции ── */
                                <>
                                    <div className="privacy-options">
                                        <label className={`privacy-option ${formData.chatPrivacy === 'All' ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="chatPrivacy"
                                                value="All"
                                                checked={formData.chatPrivacy === 'All'}
                                                onChange={handleChange}
                                                disabled={saving}
                                            />
                                            <div className="privacy-option-content">
                                                <span className="privacy-icon">
                                                    <Globe size={20} />
                                                </span>
                                                <div className="privacy-text">
                                                    <span className="privacy-title">Все пользователи</span>
                                                    <span className="privacy-description">
                                                        Любой может отправить вам сообщение
                                                    </span>
                                                </div>
                                            </div>
                                        </label>

                                        <label className={`privacy-option ${formData.chatPrivacy === 'FriendsOnly' ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="chatPrivacy"
                                                value="FriendsOnly"
                                                checked={formData.chatPrivacy === 'FriendsOnly'}
                                                onChange={handleChange}
                                                disabled={saving}
                                            />
                                            <div className="privacy-option-content">
                                                <span className="privacy-icon">
                                                    <Users size={20} />
                                                </span>
                                                <div className="privacy-text">
                                                    <span className="privacy-title">Только друзья</span>
                                                    <span className="privacy-description">
                                                        Писать смогут только ваши друзья
                                                    </span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                    {isFriendsOnly && (
                                        <span className="field-hint">
                                            <Info size={12} />
                                            Вы по-прежнему сможете писать всем пользователям
                                        </span>
                                    )}
                                </>
                            ) : (
                                /* ── Режим просмотра: одно информационное поле ── */
                                <div className={`privacy-view ${isFriendsOnly ? 'friends' : 'all'}`}>
                                    {isFriendsOnly ? (
                                        <>
                                            <Users size={16} />
                                            <span>Только друзья</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe size={16} />
                                            <span>Все пользователи</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn btn--primary"
                                    disabled={saving || uploadingAvatar}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={16} className="icon-spin" />
                                            Сохранение…
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Сохранить изменения
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* ── СТАТИСТИКА ── */}
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
                        <span className={`stat-dot ${profile?.isOnline ? 'online' : 'offline'}`} />
                        <span className="stat-label">
                            {profile?.isOnline ? 'Онлайн' : 'Оффлайн'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;