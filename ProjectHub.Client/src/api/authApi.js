// projecthub.client/src/api/authApi.js

import { setToken, getToken, removeToken, setUser, getUser, removeUser } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';

// 📌 РЕГИСТРАЦИЯ
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

        // ✅ Сохраняем в localStorage с tabId
        setToken(data.token);
        setUser(data);

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

// 📌 ВХОД
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

        // ✅ Сохраняем в localStorage с tabId
        setToken(data.token);
        setUser(data);

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

// 📌 ВЫХОД
export const logout = async () => {
    try {
        const token = getToken();

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
        removeToken();
        removeUser();
    }
};

// 📌 ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
export const getCurrentUser = async () => {
    try {
        const token = getToken();

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
            removeToken();
            removeUser();
            return null;
        }

        const data = await response.json();
        setUser(data);
        return data;
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
};

// 📌 ПРОВЕРКА АВТОРИЗОВАН ЛИ ПОЛЬЗОВАТЕЛЬ
export const isAuthenticated = () => {
    return !!getToken();
};

// 📌 ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЯ ИЗ ХРАНИЛИЩА
export const getUserFromStorage = () => {
    return getUser();
};