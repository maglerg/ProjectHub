// projecthub.client/src/services/projectCoverApi.js

import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api.
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Загрузить обложку
export const uploadProjectCover = async (projectCode, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const resp = await fetch(
        `${API_BASE_URL}/projects/code/${projectCode}/cover`,
        {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        }
    );

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка загрузки обложки');
    }
    return resp.json();
};

// Удалить обложку
export const deleteProjectCover = async (projectCode) => {
    const token = getToken();
    const resp = await fetch(
        `${API_BASE_URL}/projects/code/${projectCode}/cover`,
        {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }
    );

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка удаления обложки');
    }
    return resp.json();
};