// projecthub.client/src/services/invitationsApi.js

import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api.
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// 📌 Получить все приглашения пользователя
export const getInvitations = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invitations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения приглашений');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getInvitations:', error);
        throw error;
    }
};

// 📌 Создать приглашение в проект по публичному коду
export const createInvitationByCode = async (projectCode, email, message = '') => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invitations/project/code/${projectCode}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, message })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка отправки приглашения');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в createInvitationByCode:', error);
        throw error;
    }
};

// 📌 Принять/отклонить приглашение
export const processInvitation = async (invitationId, accept) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accept })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка обработки приглашения');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в processInvitation:', error);
        throw error;
    }
};