// projecthub.client/src/components/settings/SettingsPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Bell,
    Palette,
    Lock,
    Globe,
    LogOut,
    Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../UserAvatar';

import NotificationsSettingsSection from './sections/NotificationsSettingsSection';
import AppearanceSettingsSection from './sections/AppearanceSettingsSection';
import PrivacySettingsSection from './sections/PrivacySettingsSection';
import LanguageSettingsSection from './sections/LanguageSettingsSection';

import '../../styles/components/SettingsPage.css';

// ── Реестр разделов ──
const SECTIONS = [
    {
        key: 'notifications',
        label: 'Уведомления',
        icon: Bell,
        component: NotificationsSettingsSection,
    },
    {
        key: 'appearance',
        label: 'Внешний вид',
        icon: Palette,
        component: AppearanceSettingsSection,
    },
    {
        key: 'privacy',
        label: 'Приватность',
        icon: Lock,
        component: PrivacySettingsSection,
    },
    {
        key: 'language',
        label: 'Язык и регион',
        icon: Globe,
        component: LanguageSettingsSection,
    },
];

const DEFAULT_SECTION = 'notifications';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Раздел храним в query-параметре — можно делиться ссылкой,
    // обновление страницы не сбрасывает активный таб.
    const [searchParams, setSearchParams] = useSearchParams();

    const initialSection = searchParams.get('tab') || DEFAULT_SECTION;

    const [activeKey, setActiveKey] = useState(
        SECTIONS.some(s => s.key === initialSection)
            ? initialSection
            : DEFAULT_SECTION
    );

    // Синхронизируем query-параметр при смене раздела
    useEffect(() => {
        setSearchParams({ tab: activeKey }, { replace: true });
    }, [activeKey, setSearchParams]);

    // Активный раздел и его компонент/иконка
    const activeSection =
        SECTIONS.find(s => s.key === activeKey) || SECTIONS[0];

    // ⚠️ ВАЖНО: переменные с большой буквы — иначе React
    //    воспримет <activeSection.icon /> как HTML-тег.
    const ActiveComponent = activeSection.component;
    const ActiveIcon = activeSection.icon;

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/projects');
        }
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={handleBack}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>

                <h1>
                    <SettingsIcon size={22} />
                    Настройки
                </h1>

                <div className="settings-header-actions">
                    <div className="settings-header-user">
                        <UserAvatar
                            avatarUrl={user?.avatarUrl}
                            name={user?.name}
                            email={user?.email}
                            size="sm"
                        />
                        <span className="settings-header-user-name">
                            {user?.name || 'Пользователь'}
                        </span>
                    </div>

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

            <div className="settings-layout">
                {/* ── Сайдбар с разделами ── */}
                <aside className="settings-sidebar">
                    <nav className="settings-nav">
                        {SECTIONS.map(section => {
                            const Icon = section.icon;
                            const isActive = activeKey === section.key;

                            return (
                                <button
                                    key={section.key}
                                    type="button"
                                    className={`settings-nav-item ${isActive ? 'active' : ''}`}
                                    onClick={() => setActiveKey(section.key)}
                                >
                                    <span className="settings-nav-icon">
                                        <Icon size={18} />
                                    </span>
                                    <span className="settings-nav-label">
                                        {section.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="settings-sidebar-footer">
                        <span className="settings-version">ProjectHub</span>
                    </div>
                </aside>

                {/* ── Контент активного раздела ── */}
                <main className="settings-content">
                    <header className="settings-content-header">
                        <h2>
                            <ActiveIcon size={20} />
                            {activeSection.label}
                        </h2>
                    </header>

                    <div className="settings-content-body">
                        <ActiveComponent />
                    </div>
                </main>
            </div>
        </div>
    );
}