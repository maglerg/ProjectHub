// projecthub.client/src/services/friendRequestsApi.js

import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api.
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// 📌 Получить статус дружбы/заявки
export const getFriendStatus = async (email) => {
    try {
        const token = getToken();
        const encodedEmail = encodeURIComponent(email);
        const response = await fetch(`${API_BASE_URL}/friendrequests/status/${encodedEmail}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения статуса');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getFriendStatus:', error);
        throw error;
    }
};

// 📌 Отправить заявку в друзья
export const sendFriendRequest = async (email, message = '') => {
    try {
        const token = getToken();
        console.log('📤 Отправка заявки:', { email, message });

        const response = await fetch(`${API_BASE_URL}/friendrequests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, message })
        });

        console.log('📥 Статус ответа:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('❌ Ошибка ответа:', error);
            throw new Error(error.message || 'Ошибка отправки заявки');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в sendFriendRequest:', error);
        throw error;
    }
};

// 📌 Отменить заявку
export const cancelFriendRequest = async (requestId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/friendrequests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка отмены заявки');
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка в cancelFriendRequest:', error);
        throw error;
    }
};

// 📌 Принять/отклонить заявку
export const processFriendRequest = async (requestId, approve) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/friendrequests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approve })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка обработки заявки');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в processFriendRequest:', error);
        throw error;
    }
};

// 📌 Получить входящие заявки в друзья
export const getIncomingFriendRequests = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/friendrequests/incoming`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения заявок');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getIncomingFriendRequests:', error);
        throw error;
    }
};