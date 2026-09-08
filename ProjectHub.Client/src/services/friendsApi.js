// projecthub.client/src/services/friendsApi.js

import { getToken } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';

// 📌 Получить список друзей
export const getFriends = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/friends`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения друзей');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getFriends:', error);
        throw error;
    }
};

// 📌 Добавить друга по email (ТОЛЬКО ОДНА ФУНКЦИЯ!)
export const addFriend = async (email) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/friends`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка добавления друга');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в addFriend:', error);
        throw error;
    }
};

// 📌 Удалить друга (по ID, но ID берется из списка друзей)
export const removeFriend = async (friendId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка удаления друга');
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка в removeFriend:', error);
        throw error;
    }
};

// 📌 Проверить статус дружбы по email
export const checkFriendStatusByEmail = async (email) => {
    try {
        const token = getToken();
        const encodedEmail = encodeURIComponent(email);
        const response = await fetch(`${API_BASE_URL}/friends/status/${encodedEmail}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка проверки статуса друга');
        }

        const data = await response.json();
        return data.isFriend;
    } catch (error) {
        console.error('❌ Ошибка в checkFriendStatusByEmail:', error);
        throw error;
    }
};