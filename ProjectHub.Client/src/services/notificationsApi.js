// projecthub.client/src/services/notificationsApi.js

const API_BASE_URL = 'https://localhost:7000/api';

// 📌 Получить все уведомления
export const getNotifications = async (unreadOnly = false) => {
    try {
        const token = localStorage.getItem('token');
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
        const token = localStorage.getItem('token');
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
        const token = localStorage.getItem('token');
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