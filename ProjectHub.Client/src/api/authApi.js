// projecthub.client/src/api/authApi.js

const API_BASE_URL = 'https://localhost:7000/api';

// РЕГИСТРАЦИЯ
export const register = async (userData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка регистрации');
        }

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

// ВХОД
export const login = async (email, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка входа');
        }

        // Сохраняем токен и данные пользователя
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

// ВЫХОД
export const logout = async () => {
    try {
        const token = localStorage.getItem('token');

        if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

// ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
export const getCurrentUser = async () => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        }

        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
};

// ПРОВЕРКА АВТОРИЗОВАН ЛИ ПОЛЬЗОВАТЕЛЬ
export const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    return !!token;
};

// ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЯ ИЗ LOCALSTORAGE
export const getUserFromStorage = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};