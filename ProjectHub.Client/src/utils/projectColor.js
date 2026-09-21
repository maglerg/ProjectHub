// src/utils/projectColor.js

// ── Фиксированная палитра в стиле проекта ──
const PALETTE = [
    '#4f46e5', // indigo
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo-500
];

/**
 * Детерминированный цвет по строке-ключу (обычно publicCode или id).
 * Один и тот же проект всегда получает один и тот же цвет.
 */
export const getProjectColor = (key) => {
    if (!key) return PALETTE[0];

    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
};

/**
 * Инициалы из названия проекта.
 *   "Мой крутой проект" → "МК"
 *   "ProjectHub"        → "PR" (первые 2 буквы, если нет пробелов)
 *   "A"                 → "A"
 */
export const getProjectInitials = (name) => {
    if (!name || typeof name !== 'string') return '?';

    const trimmed = name.trim();
    if (!trimmed) return '?';

    const words = trimmed.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    if (trimmed.length >= 2) {
        return trimmed.slice(0, 2).toUpperCase();
    }

    return trimmed[0].toUpperCase();
};