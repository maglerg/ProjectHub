// src/services/projectCoverApi.js

import { getToken } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';

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