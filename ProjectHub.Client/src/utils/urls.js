// Преобразует относительные адреса загруженных файлов в абсолютные.
// В Docker клиент и API доступны браузеру через один origin (Nginx: /api и /uploads).
// Если API размещён на отдельном домене, его origin можно задать через
// REACT_APP_API_ORIGIN во время сборки frontend.

const configuredApiUrl = process.env.REACT_APP_API_URL || '/api';

const API_ORIGIN = (
    process.env.REACT_APP_API_ORIGIN ||
    (configuredApiUrl.startsWith('http://') || configuredApiUrl.startsWith('https://')
        ? new URL(configuredApiUrl).origin
        : window.location.origin)
).replace(/\/$/, '');

export const toAbsoluteUrl = (url) => {
    if (!url) return url;

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};
