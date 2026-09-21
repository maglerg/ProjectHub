// src/utils/urls.js

// В dev фронт на :3000, бэк на :7000.
// В проде можно переопределить через переменные окружения.
const API_ORIGIN =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
        ? import.meta.env.VITE_API_URL
        : (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL)
            ? process.env.REACT_APP_API_URL
            : 'https://localhost:7000';

/**
 * Превращает относительный URL из бэкенда в абсолютный.
 *   "/uploads/abc.png"          → "https://localhost:7000/uploads/abc.png"
 *   "https://example.com/x.png" → без изменений
 *   null / "" / undefined       → как есть
 */
export const toAbsoluteUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};