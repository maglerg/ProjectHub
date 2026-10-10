// projecthub.client/src/services/notificationsApi.js

import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api.
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// 📌 Получить все уведомления
export const getNotifications = async (unreadOnly = false) => {
    try {
        const token = getToken();
        const url = unreadOnly
            ? `${API_BASE_URL}/notifications?unreadOnly=true`
            : `${API_BASE_URL}/notifications`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка получения уведомлений');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getNotifications:', error);
        throw error;
    }
};

// 📌 Получить количество непрочитанных
export const getUnreadCount = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/unread/count`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка получения количества уведомлений');
        }

        const data = await response.json();
        return data.unreadCount || 0;
    } catch (error) {
        console.error('❌ Ошибка в getUnreadCount:', error);
        return 0;
    }
};

// 📌 Отметить как прочитанное
export const markAsRead = async (notificationId = null) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                all: !notificationId,
                notificationId: notificationId
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка отметки уведомлений');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в markAsRead:', error);
        throw error;
    }
};

// 📌 Получить настройки уведомлений
export const getNotificationSettings = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка получения настроек уведомлений');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в getNotificationSettings:', error);
        throw error;
    }
};

// 📌 Обновить настройки (частичное обновление)
export const updateNotificationSettings = async (dto) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dto)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Ошибка сохранения настроек');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в updateNotificationSettings:', error);
        throw error;
    }
};

// 📌 Установить режим «Не беспокоить»
// duration: 'off' | 'hour' | 'untilMorning' | 'day' | 'week'
export const setDoNotDisturb = async (duration) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/notifications/settings/dnd`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ duration })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Ошибка изменения режима');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в setDoNotDisturb:', error);
        throw error;
    }
};