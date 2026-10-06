// src/utils/accentThemes.js
//
// ⚠️ ВНИМАНИЕ: палитры продублированы в public/index.html
//    (инлайн-скрипт №2). При изменении — синхронизируйте!
//
// Порядок в массиве = порядок свотчей в UI.

export const ACCENT_THEMES = [
    {
        id: 'indigo',
        name: 'Индиго',
        preview: '#4f46e5',
        light: {
            50: '#eef2ff',
            100: '#e0e7ff',
            200: '#c7d2fe',
            500: '#4f46e5',
            600: '#4338ca',
            700: '#3730a3',
        },
        dark: {
            50: '#1e1b4b',
            100: '#312e81',
            200: '#4338ca',
            500: '#6366f1',
            600: '#818cf8',
            700: '#a5b4fc',
        },
    },
    {
        id: 'violet',
        name: 'Фиолетовый',
        preview: '#7c3aed',
        light: {
            50: '#f5f3ff',
            100: '#ede9fe',
            200: '#ddd6fe',
            500: '#7c3aed',
            600: '#6d28d9',
            700: '#5b21b6',
        },
        dark: {
            50: '#2e1065',
            100: '#4c1d95',
            200: '#6d28d9',
            500: '#8b5cf6',
            600: '#a78bfa',
            700: '#c4b5fd',
        },
    },
    {
        id: 'blue',
        name: 'Синий',
        preview: '#2563eb',
        light: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            500: '#2563eb',
            600: '#1d4ed8',
            700: '#1e40af',
        },
        dark: {
            50: '#172554',
            100: '#1e3a8a',
            200: '#1d4ed8',
            500: '#3b82f6',
            600: '#60a5fa',
            700: '#93c5fd',
        },
    },
    {
        id: 'emerald',
        name: 'Изумруд',
        preview: '#059669',
        light: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            500: '#059669',
            600: '#047857',
            700: '#065f46',
        },
        dark: {
            50: '#022c22',
            100: '#064e3b',
            200: '#047857',
            500: '#10b981',
            600: '#34d399',
            700: '#6ee7b7',
        },
    },
    {
        id: 'rose',
        name: 'Розовый',
        preview: '#e11d48',
        light: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            500: '#e11d48',
            600: '#be123c',
            700: '#9f1239',
        },
        dark: {
            50: '#4c0519',
            100: '#881337',
            200: '#be123c',
            500: '#f43f5e',
            600: '#fb7185',
            700: '#fda4af',
        },
    },
    {
        id: 'amber',
        name: 'Янтарь',
        preview: '#d97706',
        light: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            500: '#d97706',
            600: '#b45309',
            700: '#92400e',
        },
        dark: {
            50: '#451a03',
            100: '#78350f',
            200: '#b45309',
            500: '#f59e0b',
            600: '#fbbf24',
            700: '#fcd34d',
        },
    },
];

export const DEFAULT_ACCENT_ID = 'indigo';

export function getAccentById(id) {
    return (
        ACCENT_THEMES.find((a) => a.id === id) ||
        ACCENT_THEMES.find((a) => a.id === DEFAULT_ACCENT_ID)
    );
}

/**
 * Применяет акцентный цвет к корню документа.
 * @param {string} accentId  — id пресета
 * @param {boolean} isDark   — текущая тема
 */
export function applyAccent(accentId, isDark = false) {
    const accent = getAccentById(accentId);
    const palette = isDark ? accent.dark : accent.light;
    const root = document.documentElement;

    root.style.setProperty('--color-primary-50', palette[50]);
    root.style.setProperty('--color-primary-100', palette[100]);
    root.style.setProperty('--color-primary-200', palette[200]);
    root.style.setProperty('--color-primary-500', palette[500]);
    root.style.setProperty('--color-primary-600', palette[600]);
    root.style.setProperty('--color-primary-700', palette[700]);
}