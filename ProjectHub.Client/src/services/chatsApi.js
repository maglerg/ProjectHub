// projecthub.client/src/services/chatsApi.js

import { getToken } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';

// 📌 Получить список чатов пользователя
export const getChats = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/chats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка создания чата');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getChats:', error);
        throw error;
    }
};

// 📌 Создать или получить личный чат
export const createPersonalChat = async (email) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/chats/personal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка создания чата');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в createPersonalChat:', error);
        throw error;
    }
};

// 📌 Получить чат по ID
export const getChatById = async (chatId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения чата');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getChatById:', error);
        throw error;
    }
};

// 📌 Получить сообщения чата
export const getChatMessages = async (chatId, skip = 0, take = 50) => {
    try {
        const token = getToken();
        const response = await fetch(
            `${API_BASE_URL}/chats/${chatId}/messages?skip=${skip}&take=${take}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения сообщений');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getChatMessages:', error);
        throw error;
    }
};

// 📌 Отправить сообщение
export const sendMessage = async (chatId, text) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка отправки сообщения');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в sendMessage:', error);
        throw error;
    }
};