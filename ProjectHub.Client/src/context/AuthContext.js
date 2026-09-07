// projecthub.client/src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    getCurrentUser,
    isAuthenticated,
    getUserFromStorage,
} from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 📌 Загружаем пользователя при старте
    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        setLoading(true);
        try {
            // ✅ Проверяем, есть ли токен в localStorage (с tabId)
            if (isAuthenticated()) {
                const userData = await getCurrentUser();
                if (userData) {
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } else {
                const storedUser = getUserFromStorage();
                if (storedUser) {
                    // 📌 Проверяем, не истек ли токен (на бэкенде)
                    try {
                        const refreshedUser = await getCurrentUser();
                        setUser(refreshedUser || storedUser);
                    } catch {
                        setUser(storedUser);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading user:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    // 📌 Вход
    const handleLogin = async (email, password) => {
        setError(null);
        try {
            const userData = await apiLogin(email, password);
            setUser(userData);
            return userData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 📌 Регистрация
    const handleRegister = async (userData) => {
        setError(null);
        try {
            const data = await apiRegister(userData);
            // После регистрации автоматически логиним пользователя
            setUser(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 📌 Выход
    const handleLogout = async () => {
        try {
            await apiLogout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        error,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        isAuthenticated: !!user && isAuthenticated(),
        setUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};