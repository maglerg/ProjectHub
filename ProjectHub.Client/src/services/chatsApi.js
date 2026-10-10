// projecthub.client/src/services/chatsApi.js

import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api.
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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

// 📌 Получить или создать чат проекта по публичному коду
export const getProjectChatByCode = async (publicCode) => {
    try {
        const token = getToken();
        const encodedCode = encodeURIComponent(publicCode);
        const response = await fetch(`${API_BASE_URL}/chats/project/by-code/${encodedCode}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения чата проекта');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getProjectChatByCode:', error);
        throw error;
    }
};

// Отправить файл в чат
export const sendChatFile = async (chatId, file, caption = null) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        if (caption) formData.append('caption', caption);

        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/file`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            // Content-Type НЕ указываем — браузер сам поставит multipart/form-data с boundary
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка отправки файла');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в sendChatFile:', error);
        throw error;
    }
};

// Скачать файл из чата (blob → сохранение)
export const downloadChatFile = async (chatId, messageId, fileName) => {
    try {
        const token = getToken();
        const response = await fetch(
            `${API_BASE_URL}/chats/${chatId}/messages/${messageId}/file`,
            {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка скачивания файла');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('❌ Ошибка в downloadChatFile:', error);
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