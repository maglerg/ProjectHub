// src/services/userAvatarApi.js

import { getToken } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';

// Загрузить аватар
export const uploadUserAvatar = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const resp = await fetch(`${API_BASE_URL}/users/avatar`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка загрузки аватара');
    }
    return resp.json();
};

// Удалить аватар
export const deleteUserAvatar = async () => {
    const token = getToken();
    const resp = await fetch(`${API_BASE_URL}/users/avatar`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка удаления аватара');
    }
    return resp.json();
};