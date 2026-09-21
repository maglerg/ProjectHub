// src/utils/userColor.js

// Палитра для пользователей — немного отличается от проектной,
// чтобы визуально различать «человека» и «проект».
const PALETTE = [
    '#6366f1', // indigo
    '#3b82f6', // blue
    '#0ea5e9', // sky
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#10b981', // emerald
    '#84cc16', // lime
    '#eab308', // yellow
    '#f97316', // orange
    '#ef4444', // red
    '#ec4899', // pink
    '#a855f7', // purple
    '#8b5cf6', // violet
];

/**
 * Детерминированный цвет по ключу (email или id).
 * Один и тот же пользователь всегда одного цвета.
 */
export const getUserColor = (key) => {
    if (!key) return PALETTE[0];

    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
};

/**
 * Инициалы пользователя — 1–2 буквы.
 *   "Иван Иванов"     → "ИИ"
 *   "Анна"            → "АН"
 *   "john@mail.com"   → "JO"
 */
export const getUserInitials = (name, email) => {
    const source =
        (name && name.trim()) ||
        (email && email.split('@')[0]) ||
        '?';

    const words = source.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    if (source.length >= 2) {
        return source.slice(0, 2).toUpperCase();
    }

    return source[0].toUpperCase();
};