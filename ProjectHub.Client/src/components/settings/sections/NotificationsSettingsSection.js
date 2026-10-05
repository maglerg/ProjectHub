// projecthub.client/src/components/settings/sections/NotificationsSettingsSection.js

import React, { useState, useEffect, useCallback } from 'react';
import {
    Bell,
    BellOff,
    MessageCircle,
    UserPlus,
    Mail,
    Inbox,
    Users,
    MessageSquare,
    Vote,
    Clock,
    AlertCircle,
    Check,
    Loader2,
    Moon,
    Sun,
    X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
    getNotificationSettings,
    updateNotificationSettings,
    setDoNotDisturb,
} from '../../../services/notificationsApi';
import { signalr } from '../../../services/signalrService';
import ToggleSwitch from '../ToggleSwitch';
import '../../../styles/components/SettingsNotifications.css';

// ── Метаданные тумблеров по типам ──
const TYPE_TOGGLES = [
    {
        key: 'newMessages',
        icon: MessageCircle,
        title: 'Новые сообщения в чатах',
        description: 'Личные и проектные чаты',
    },
    {
        key: 'friendRequests',
        icon: UserPlus,
        title: 'Заявки в друзья',
        description: 'Входящие заявки и результаты по вашим',
    },
    {
        key: 'projectInvitations',
        icon: Mail,
        title: 'Приглашения в проекты',
        description: 'Когда вас приглашают в проект',
    },
    {
        key: 'applications',
        icon: Inbox,
        title: 'Заявки на вступление',
        description: 'Только для владельца и админов проекта',
    },
    {
        key: 'projectChanges',
        icon: Users,
        title: 'Изменения в проекте',
        description: 'Роль, удаление, архив, новый участник',
    },
    {
        key: 'taskComments',
        icon: MessageSquare,
        title: 'Комментарии к задачам',
        description: 'Новые комментарии и ответы',
    },
    {
        key: 'votings',
        icon: Vote,
        title: 'Голосования',
        description: 'Новые голосования в проектах',
    },
    {
        key: 'taskDeadlines',
        icon: Clock,
        title: 'Дедлайны задач',
        description: 'Напоминания о приближающихся сроках',
    },
];

// ── Опции «Не беспокоить» ──
const DND_OPTIONS = [
    { value: 'hour', label: 'На час', icon: Clock },
    { value: 'untilMorning', label: 'До утра', icon: Moon },
    { value: 'day', label: 'На день', icon: Sun },
    { value: 'off', label: 'Выключить', icon: X },
];

const NotificationsSettingsSection = () => {
    const { user } = useAuth();

    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dndLoading, setDndLoading] = useState(false);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // ── Загрузка ──
    const loadSettings = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await getNotificationSettings();
            setSettings(data);
        } catch (err) {
            console.error('❌ Ошибка загрузки настроек:', err);
            if (!silent) setError(err.message || 'Не удалось загрузить настройки');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // ═══════════════════════════════════════════════════════════
    //  SignalR: синхронизация между вкладками
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const handleSettingsChanged = (updated) => {
            // Тихая замена состояния — без спиннера
            setSettings(updated);
        };

        signalr.on('NotificationSettingsChanged', handleSettingsChanged);

        signalr.connect().catch((err) => {
            console.warn('SignalR connect from SettingsPage failed:', err);
        });

        return () => {
            signalr.off('NotificationSettingsChanged', handleSettingsChanged);
        };
    }, []);

    // ── Тумблер ──
    const handleToggle = async (key, value) => {
        if (!settings || saving) return;

        // Оптимистичное обновление
        const previous = { ...settings };
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaving(true);
        setError(null);

        try {
            const updated = await updateNotificationSettings({ [key]: value });
            setSettings(updated);
        } catch (err) {
            console.error('❌ Ошибка сохранения:', err);
            setSettings(previous);   // откат
            setError(err.message || 'Не удалось сохранить');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    // ── Смена «за N дней» ──
    const handleDaysChange = async (e) => {
        const value = parseInt(e.target.value, 10);
        if (!settings || saving) return;

        const previous = settings.deadlineDaysBefore;
        setSettings(prev => ({ ...prev, deadlineDaysBefore: value }));
        setSaving(true);

        try {
            const updated = await updateNotificationSettings({ deadlineDaysBefore: value });
            setSettings(updated);
        } catch (err) {
            setSettings(prev => ({ ...prev, deadlineDaysBefore: previous }));
            setError(err.message || 'Не удалось сохранить');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    // ── DND ──
    const handleDnd = async (duration) => {
        if (dndLoading) return;
        setDndLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const updated = await setDoNotDisturb(duration);
            setSettings(updated);

            if (duration === 'off') {
                setSuccess('🔔 Уведомления снова включены');
            } else {
                setSuccess('🔕 Режим «Не беспокоить» включён');
            }
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message || 'Не удалось изменить режим');
            setTimeout(() => setError(null), 3000);
        } finally {
            setDndLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-section-loading">
                <Loader2 size={28} className="icon-spin" />
                <p>Загрузка настроек…</p>
            </div>
        );
    }

    if (error && !settings) {
        return (
            <div className="settings-section-error">
                <AlertCircle size={24} />
                <p>{error}</p>
                <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => loadSettings()}
                >
                    Попробовать снова
                </button>
            </div>
        );
    }

    if (!settings) return null;

    const masterEnabled = settings.enabled;
    const dndActive = settings.isDoNotDisturbActive;

    // Форматируем время окончания DND
    const formatDndUntil = () => {
        if (!settings.doNotDisturbUntil) return null;
        try {
            const date = new Date(settings.doNotDisturbUntil);
            return date.toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit',
            });
        } catch {
            return null;
        }
    };

    return (
        <div className="settings-notifications">
            {success && (
                <div className="settings-notification success">
                    <Check size={14} />
                    {success}
                </div>
            )}
            {error && (
                <div className="settings-notification error">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {/* ═══ МАСТЕР-ПЕРЕКЛЮЧАТЕЛЬ ═══ */}
            <section className="settings-card settings-card--master">
                <div className="master-row">
                    <span className={`master-icon ${masterEnabled ? 'on' : 'off'}`}>
                        {masterEnabled ? <Bell size={22} /> : <BellOff size={22} />}
                    </span>
                    <div className="master-text">
                        <h3>Все уведомления</h3>
                        <p>
                            {masterEnabled
                                ? 'Уведомления включены. Отдельные типы можно настроить ниже.'
                                : 'Все уведомления отключены. Ничего не будет приходить.'}
                        </p>
                    </div>
                    <ToggleSwitch
                        checked={masterEnabled}
                        onChange={(v) => handleToggle('enabled', v)}
                        disabled={saving}
                        size="lg"
                    />
                </div>
            </section>

            {/* ═══ НЕ БЕСПОКОИТЬ ═══ */}
            <section className="settings-card">
                <header className="settings-card-header">
                    <h3>
                        <Moon size={16} />
                        Не беспокоить
                    </h3>
                    {dndActive && settings.doNotDisturbUntil && (
                        <span className="dnd-active-badge">
                            Активно до {formatDndUntil()}
                        </span>
                    )}
                </header>

                <p className="settings-card-hint">
                    Временное отключение всех уведомлений.
                </p>

                <div className="dnd-options">
                    {DND_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        // «Выключить» — активна, когда DND выключен
                        // Остальные — неактивны, если DND выключен
                        const isOff = opt.value === 'off';
                        const isDisabledByMaster = !masterEnabled && !isOff;
                        const isActive = isOff ? !dndActive : dndActive;

                        // Активную опцию не подсвечиваем, если DND уже выключен
                        const showActive = isOff
                            ? !dndActive && masterEnabled
                            : false;

                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`dnd-btn ${showActive ? 'active' : ''}`}
                                onClick={() => handleDnd(opt.value)}
                                disabled={dndLoading || isDisabledByMaster}
                            >
                                <Icon size={14} />
                                {opt.label}
                            </button>
                        );
                    })}
                </div>

                {!masterEnabled && (
                    <p className="settings-card-warn">
                        <AlertCircle size={12} />
                        Мастер-переключатель выключен — режим недоступен
                    </p>
                )}
            </section>

            {/* ═══ ПО ТИПАМ ═══ */}
            <section className="settings-card">
                <header className="settings-card-header">
                    <h3>Типы уведомлений</h3>
                </header>

                <p className="settings-card-hint">
                    Каждое можно отключить отдельно.
                </p>

                <div className="settings-toggles-list">
                    {TYPE_TOGGLES.map(item => {
                        const Icon = item.icon;
                        const value = settings[item.key];

                        return (
                            <div
                                key={item.key}
                                className={`toggle-row ${!masterEnabled ? 'disabled' : ''}`}
                            >
                                <span className="toggle-icon">
                                    <Icon size={16} />
                                </span>
                                <div className="toggle-text">
                                    <div className="toggle-title">{item.title}</div>
                                    <div className="toggle-description">{item.description}</div>
                                </div>
                                <ToggleSwitch
                                    checked={value}
                                    onChange={(v) => handleToggle(item.key, v)}
                                    disabled={saving || !masterEnabled}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* ── Настройки дедлайнов (раскрываются, если включены) ── */}
                {settings.taskDeadlines && masterEnabled && (
                    <div className="deadline-days-row">
                        <span className="toggle-icon">
                            <Clock size={16} />
                        </span>
                        <div className="toggle-text">
                            <div className="toggle-title">За сколько дней предупреждать</div>
                            <div className="toggle-description">
                                От 1 до 14 дней до дедлайна
                            </div>
                        </div>
                        <select
                            className="deadline-days-select"
                            value={settings.deadlineDaysBefore}
                            onChange={handleDaysChange}
                            disabled={saving}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(n => (
                                <option key={n} value={n}>
                                    за {n} {n === 1 ? 'день' : n < 5 ? 'дня' : 'дней'}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </section>
        </div>
    );
};

export default NotificationsSettingsSection;