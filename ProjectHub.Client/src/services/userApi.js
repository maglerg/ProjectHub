// projecthub.client/src/services/userApi.js

const API_BASE_URL = 'https://localhost:7000/api';

// 📌 Получить данные текущего пользователя
export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения данных пользователя');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getCurrentUser:', error);
        throw error;
    }
};
// 📌 Получить профиль пользователя по email
export const getUserProfileByEmail = async (email) => {
    try {
        const token = localStorage.getItem('token');
        const encodedEmail = encodeURIComponent(email);
        const response = await fetch(`${API_BASE_URL}/users/email/${encodedEmail}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения профиля пользователя');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getUserProfileByEmail:', error);
        throw error;
    }
};
// 📌 Обновить данные пользователя
export const updateUser = async (userData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: userData.name,
                specialization: userData.specialization,
                description: userData.description
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка обновления профиля');
        }

        const data = await response.json();

        // Обновляем данные в localStorage
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...storedUser, ...data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
            console.warn('Не удалось обновить localStorage:', e);
        }

        return data;
    } catch (error) {
        console.error('❌ Ошибка в updateUser:', error);
        throw error;
    }
};