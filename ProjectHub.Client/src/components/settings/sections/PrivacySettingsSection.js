// projecthub.client/src/components/settings/sections/PrivacySettingsSection.js

import React, { useState, useEffect, useCallback } from 'react';
import {
    Lock,
    MessageCircle,
    Globe,
    Users,
    EyeOff,
    Eye,
    KeyRound,
    Loader2,
    AlertCircle,
    Check,
    Save,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getCurrentUser, updateUser, changePassword } from '../../../services/userApi';
import { signalr } from '../../../services/signalrService';
import '../../../styles/components/SettingsPrivacy.css';

// ── Опции приватности чата ──
const CHAT_PRIVACY_OPTIONS = [
    {
        value: 'All',
        icon: Globe,
        title: 'Все пользователи',
        description: 'Любой может отправить вам сообщение',
    },
    {
        value: 'FriendsOnly',
        icon: Users,
        title: 'Только друзья',
        description: 'Писать смогут только ваши друзья',
    },
];

// ── Опции видимости онлайн-статуса ──
const ONLINE_VISIBILITY_OPTIONS = [
    {
        value: 'Everyone',
        icon: Eye,
        title: 'Все пользователи',
        description: 'Все видят, когда вы онлайн',
    },
    {
        value: 'FriendsOnly',
        icon: Users,
        title: 'Только друзья',
        description: 'Онлайн-статус виден только вашим друзьям',
    },
    {
        value: 'Nobody',
        icon: EyeOff,
        title: 'Никто',
        description: 'Вас всегда показывают оффлайн',
    },
];

export default function PrivacySettingsSection() {
    const { user, setUser } = useAuth();

    // ── Загрузка ──
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Приватность ──
    const [chatPrivacy, setChatPrivacy] = useState('All');
    const [onlineVisibility, setOnlineVisibility] = useState('Everyone');
    const [savingPrivacy, setSavingPrivacy] = useState(false);
    const [privacySuccess, setPrivacySuccess] = useState(null);
    const [privacyError, setPrivacyError] = useState(null);

    // ── Смена пароля ──
    const [pwd, setPwd] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState(null);
    const [pwdError, setPwdError] = useState(null);

    // ── Загрузка текущих значений ──
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getCurrentUser();
            setChatPrivacy(data.chatPrivacy || 'All');
            setOnlineVisibility(data.onlineVisibility || 'Everyone');

            // Синхронизируем user в контексте
            if (setUser) setUser(data);
        } catch (err) {
            console.error('❌ Ошибка загрузки настроек приватности:', err);
            setError(err.message || 'Не удалось загрузить настройки');
        } finally {
            setLoading(false);
        }
    }, [setUser]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ═══════════════════════════════════════════════════════════
    //  SignalR: синхронизация онлайн-статуса между вкладками
    //  (если пользователь сменил приватность в одной вкладке,
    //   другая тоже должна обновиться)
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const handleSettingsChanged = (dto) => {
            // dto — UserResponseDto, прилетающий от наших сервисов
            if (dto?.chatPrivacy) setChatPrivacy(dto.chatPrivacy);
            if (dto?.onlineVisibility) setOnlineVisibility(dto.onlineVisibility);
        };

        // У нас нет явного события для privacy — слушаем общий апдейт.
        // Если у тебя на бэке нет такого события, просто пропусти этот блок.
        signalr.on('UserUpdated', handleSettingsChanged);

        return () => {
            signalr.off('UserUpdated', handleSettingsChanged);
        };
    }, []);

    // ═══════════════════════════════════════════════════════════
    //  Сохранение приватности
    // ═══════════════════════════════════════════════════════════
    const handleSavePrivacy = async () => {
        if (savingPrivacy) return;

        setSavingPrivacy(true);
        setPrivacyError(null);
        setPrivacySuccess(null);

        try {
            // Отправляем только privacy-поля — остальные не трогаем.
            // Имя/specialization/description придут пустыми и, т.к. бэк
            // их перезаписывает, подставим текущие.
            const updated = await updateUser({
                name: user?.name || '',
                specialization: user?.specialization || '',
                description: user?.description || '',
                chatPrivacy,
                onlineVisibility,
            });

            if (setUser) setUser(updated);

            setPrivacySuccess('✅ Настройки приватности сохранены');
            setTimeout(() => setPrivacySuccess(null), 3000);
        } catch (err) {
            console.error('❌ Ошибка сохранения приватности:', err);
            setPrivacyError(err.message || 'Не удалось сохранить');
            setTimeout(() => setPrivacyError(null), 4000);
        } finally {
            setSavingPrivacy(false);
        }
    };

    // ═══════════════════════════════════════════════════════════
    //  Смена пароля
    // ═══════════════════════════════════════════════════════════
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (changingPwd) return;

        setPwdError(null);
        setPwdSuccess(null);

        // Клиентская валидация (дублирует бэк, чтобы не гонять зря)
        if (!pwd.currentPassword) {
            setPwdError('Введите текущий пароль');
            return;
        }
        if (!pwd.newPassword) {
            setPwdError('Введите новый пароль');
            return;
        }
        if (pwd.newPassword.length < 6) {
            setPwdError('Новый пароль должен содержать минимум 6 символов');
            return;
        }
        if (pwd.newPassword !== pwd.confirmPassword) {
            setPwdError('Новый пароль и его подтверждение не совпадают');
            return;
        }
        if (pwd.currentPassword === pwd.newPassword) {
            setPwdError('Новый пароль должен отличаться от текущего');
            return;
        }

        setChangingPwd(true);
        try {
            await changePassword(pwd);

            setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPwdSuccess('✅ Пароль успешно изменён');
            setTimeout(() => setPwdSuccess(null), 4000);
        } catch (err) {
            console.error('❌ Ошибка смены пароля:', err);
            // 401 = «неверный текущий пароль» — показываем как есть
            setPwdError(err.message || 'Не удалось сменить пароль');
        } finally {
            setChangingPwd(false);
        }
    };

    const handlePwdChange = (field) => (e) => {
        setPwd(prev => ({ ...prev, [field]: e.target.value }));
    };

    // ── Состояния ──
    if (loading) {
        return (
            <div className="settings-section-loading">
                <Loader2 size={28} className="icon-spin" />
                <p>Загрузка настроек приватности…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="settings-section-error">
                <AlertCircle size={24} />
                <p>{error}</p>
                <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={loadData}
                >
                    Попробовать снова
                </button>
            </div>
        );
    }

    return (
        <div className="settings-privacy">
            {/* ═══════════════════════════════════════════════════
                БЛОК 1: КТО МОЖЕТ МНЕ ПИСАТЬ
               ═══════════════════════════════════════════════════ */}
            <section className="settings-card">
                <header className="settings-card-header">
                    <h3>
                        <MessageCircle size={16} />
                        Кто может мне писать
                    </h3>
                </header>

                <p className="settings-card-hint">
                    Определяет, кто может начать с вами личный чат.
                </p>

                <div className="privacy-options-vertical">
                    {CHAT_PRIVACY_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const selected = chatPrivacy === opt.value;

                        return (
                            <label
                                key={opt.value}
                                className={`privacy-option-card ${selected ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="chatPrivacy"
                                    value={opt.value}
                                    checked={selected}
                                    onChange={() => setChatPrivacy(opt.value)}
                                />
                                <span className="privacy-option-icon">
                                    <Icon size={18} />
                                </span>
                                <div className="privacy-option-text">
                                    <div className="privacy-option-title">{opt.title}</div>
                                    <div className="privacy-option-description">
                                        {opt.description}
                                    </div>
                                </div>
                                {selected && (
                                    <span className="privacy-option-check">
                                        <Check size={16} />
                                    </span>
                                )}
                            </label>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                БЛОК 2: КТО ВИДИТ МОЙ ОНЛАЙН-СТАТУС
               ═══════════════════════════════════════════════════ */}
            <section className="settings-card">
                <header className="settings-card-header">
                    <h3>
                        <Eye size={16} />
                        Кто видит мой онлайн-статус
                    </h3>
                </header>

                <p className="settings-card-hint">
                    Когда вы заходите в сеть или выходите, эти пользователи
                    видят изменение статуса.
                </p>

                <div className="privacy-options-vertical">
                    {ONLINE_VISIBILITY_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const selected = onlineVisibility === opt.value;

                        return (
                            <label
                                key={opt.value}
                                className={`privacy-option-card ${selected ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="onlineVisibility"
                                    value={opt.value}
                                    checked={selected}
                                    onChange={() => setOnlineVisibility(opt.value)}
                                />
                                <span className="privacy-option-icon">
                                    <Icon size={18} />
                                </span>
                                <div className="privacy-option-text">
                                    <div className="privacy-option-title">{opt.title}</div>
                                    <div className="privacy-option-description">
                                        {opt.description}
                                    </div>
                                </div>
                                {selected && (
                                    <span className="privacy-option-check">
                                        <Check size={16} />
                                    </span>
                                )}
                            </label>
                        );
                    })}
                </div>
            </section>

            {/* ── Общая кнопка сохранения приватности ── */}
            <div className="settings-privacy-actions">
                {privacySuccess && (
                    <div className="settings-notification success">
                        <Check size={14} />
                        {privacySuccess}
                    </div>
                )}
                {privacyError && (
                    <div className="settings-notification error">
                        <AlertCircle size={14} />
                        {privacyError}
                    </div>
                )}

                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleSavePrivacy}
                    disabled={savingPrivacy}
                >
                    {savingPrivacy ? (
                        <>
                            <Loader2 size={16} className="icon-spin" />
                            Сохранение…
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            Сохранить настройки приватности
                        </>
                    )}
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════
                БЛОК 3: СМЕНА ПАРОЛЯ
               ═══════════════════════════════════════════════════ */}
            <section className="settings-card settings-card--password">
                <header className="settings-card-header">
                    <h3>
                        <KeyRound size={16} />
                        Смена пароля
                    </h3>
                </header>

                <p className="settings-card-hint">
                    После смены пароля текущие сессии продолжат работать
                    до истечения токена. Чтобы войти на новом устройстве,
                    используйте новый пароль.
                </p>

                <form onSubmit={handleChangePassword} className="password-form">
                    <div className="form-group">
                        <label htmlFor="current-password">Текущий пароль</label>
                        <input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            value={pwd.currentPassword}
                            onChange={handlePwdChange('currentPassword')}
                            disabled={changingPwd}
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="new-password">Новый пароль</label>
                            <input
                                id="new-password"
                                type="password"
                                autoComplete="new-password"
                                value={pwd.newPassword}
                                onChange={handlePwdChange('newPassword')}
                                disabled={changingPwd}
                                placeholder="Минимум 6 символов"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm-password">Повторите новый пароль</label>
                            <input
                                id="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                value={pwd.confirmPassword}
                                onChange={handlePwdChange('confirmPassword')}
                                disabled={changingPwd}
                                placeholder="Повторите пароль"
                            />
                        </div>
                    </div>

                    {pwdSuccess && (
                        <div className="settings-notification success">
                            <Check size={14} />
                            {pwdSuccess}
                        </div>
                    )}
                    {pwdError && (
                        <div className="settings-notification error">
                            <AlertCircle size={14} />
                            {pwdError}
                        </div>
                    )}

                    <div className="password-form-actions">
                        <button
                            type="submit"
                            className="btn btn--primary"
                            disabled={changingPwd}
                        >
                            {changingPwd ? (
                                <>
                                    <Loader2 size={16} className="icon-spin" />
                                    Смена пароля…
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={16} />
                                    Сменить пароль
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}