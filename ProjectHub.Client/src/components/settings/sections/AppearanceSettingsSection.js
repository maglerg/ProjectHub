// projecthub.client/src/components/settings/sections/AppearanceSettingsSection.js

import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import ToggleSwitch from '../ToggleSwitch';
import '../../../styles/components/SettingsAppearance.css';

export default function AppearanceSettingsSection() {
    const { effectiveTheme, setTheme } = useTheme();

    const isDark = effectiveTheme === 'dark';

    const handleToggle = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <div className="settings-appearance">
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
                            onChange={handleToggle}
                            size="md"
                            aria-label="Переключить тему"
                        />
                    </div>
                </div>

                {/* Превью активной темы */}
                <div className="theme-preview">
                    <div className="theme-preview-label">
                        Текущая тема: <b>{isDark ? 'Тёмная' : 'Светлая'}</b>
                    </div>
                </div>
            </section>
        </div>
    );
}