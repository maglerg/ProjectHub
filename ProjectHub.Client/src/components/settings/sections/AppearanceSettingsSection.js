// projecthub.client/src/components/settings/sections/AppearanceSettingsSection.js

import React, { useState, useEffect } from 'react';
import {
    Sun,
    Moon,
    Palette,
    Check,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import ToggleSwitch from '../ToggleSwitch';
import {
    ACCENT_THEMES,
    DEFAULT_ACCENT_ID,
    getAccentById,
} from '../../../utils/accentThemes';
import '../../../styles/components/SettingsAppearance.css';

const ACCENT_STORAGE_KEY = 'projecthub.accent';

export default function AppearanceSettingsSection() {
    const { effectiveTheme, setTheme } = useTheme();
    const isDark = effectiveTheme === 'dark';

    const [accentId, setAccentId] = useState(
        () => localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT_ID
    );
    const [savingAccent, setSavingAccent] = useState(false);
    const [accentSuccess, setAccentSuccess] = useState(null);
    const [accentError, setAccentError] = useState(null);

    const handleThemeToggle = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    const applyAccentToDocument = (id) => {
        const accent = getAccentById(id);
        const palette = isDark ? accent.dark : accent.light;
        const root = document.documentElement;

        root.style.setProperty('--color-primary-50', palette[50]);
        root.style.setProperty('--color-primary-100', palette[100]);
        root.style.setProperty('--color-primary-200', palette[200]);
        root.style.setProperty('--color-primary-500', palette[500]);
        root.style.setProperty('--color-primary-600', palette[600]);
        root.style.setProperty('--color-primary-700', palette[700]);
    };

    useEffect(() => {
        applyAccentToDocument(accentId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark, accentId]);

    const handleAccentSelect = (id) => {
        if (savingAccent || id === accentId) return;

        setSavingAccent(true);
        setAccentError(null);
        setAccentSuccess(null);

        try {
            localStorage.setItem(ACCENT_STORAGE_KEY, id);
            setAccentId(id);

            const accent = getAccentById(id);
            const palette = isDark ? accent.dark : accent.light;
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', palette[500]);

            setAccentSuccess('✅ Акцентный цвет обновлён');
            setTimeout(() => setAccentSuccess(null), 2500);
        } catch (err) {
            console.error('❌ Ошибка сохранения акцента:', err);
            setAccentError('Не удалось сохранить выбор');
            setTimeout(() => setAccentError(null), 3000);
        } finally {
            setSavingAccent(false);
        }
    };

    const activeAccent = getAccentById(accentId);

    return (
        <div className="settings-appearance">

            {/* ═══ ТЕМА ═══ */}
            <section className="settings-card">
                <header className="settings-card-header">
                    <Palette size={16} />
                    <h3>Тема оформления</h3>
                </header>

                <p className="settings-card-hint">
                    Выберите, как выглядит интерфейс. Изменения применяются
                    мгновенно и сохраняются на этом устройстве.
                </p>

                <div className="theme-switch-row">
                    <div className="theme-switch-label">
                        <span className={`theme-switch-icon ${isDark ? 'active' : ''}`}>
                            {isDark ? <Moon size={20} /> : <Sun size={20} />}
                        </span>

                        <div className="theme-switch-text">
                            <div className="theme-switch-title">
                                {isDark ? 'Тёмная тема' : 'Светлая тема'}
                            </div>
                            <div className="theme-switch-description">
                                {isDark
                                    ? 'Интерфейс с тёмным фоном'
                                    : 'Интерфейс со светлым фоном'}
                            </div>
                        </div>
                    </div>

                    <div className="theme-switch-control">
                        <span className="theme-switch-state">
                            {isDark ? 'Тёмная' : 'Светлая'}
                        </span>
                        <ToggleSwitch
                            checked={isDark}
                            onChange={handleThemeToggle}
                            size="md"
                            aria-label="Переключить тему"
                        />
                    </div>
                </div>
            </section>

            {/* ═══ АКЦЕНТНЫЙ ЦВЕТ ═══ */}
            <section className="settings-card">
                <header className="settings-card-header">
                    <Palette size={16} />
                    <h3>Акцентный цвет</h3>
                </header>

                <p className="settings-card-hint">
                    Используется для кнопок, ссылок, активных элементов
                    и подсветки фокуса. Сейчас выбран:{' '}
                    <b>{activeAccent.name}</b>.
                </p>

                <div className="accent-picker" role="radiogroup" aria-label="Акцентный цвет">
                    {ACCENT_THEMES.map((accent) => {
                        const isActive = accent.id === accentId;
                        return (
                            <button
                                key={accent.id}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                className={`accent-picker__item ${isActive ? 'active' : ''}`}
                                onClick={() => handleAccentSelect(accent.id)}
                                disabled={savingAccent}
                                title={accent.name}
                                aria-label={accent.name}
                            >
                                <span
                                    className="accent-picker__swatch"
                                    style={{ backgroundColor: accent.preview }}
                                >
                                    {isActive && <Check size={16} color="#fff" strokeWidth={3} />}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {savingAccent && (
                    <div className="accent-picker__status">
                        <Loader2 size={12} className="icon-spin" />
                        Сохранение…
                    </div>
                )}

                {accentSuccess && (
                    <div className="settings-notification success">
                        <Check size={14} />
                        {accentSuccess}
                    </div>
                )}
                {accentError && (
                    <div className="settings-notification error">
                        <AlertCircle size={14} />
                        {accentError}
                    </div>
                )}
            </section>
        </div>
    );
}