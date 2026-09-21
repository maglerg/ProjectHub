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
    const [user, setUserState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 📌 Загружаем пользователя при старте
    useEffect(() => {
        loadUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadUser = async () => {
        setLoading(true);
        try {
            if (isAuthenticated()) {
                const userData = await getCurrentUser();
                if (userData) {
                    setUserState(userData);
                    persistUser(userData);   // 🆕 синхронизируем localStorage
                } else {
                    setUserState(null);
                }
            } else {
                const storedUser = getUserFromStorage();
                if (storedUser) {
                    try {
                        const refreshedUser = await getCurrentUser();
                        const next = refreshedUser || storedUser;
                        setUserState(next);
                        persistUser(next);
                    } catch {
                        setUserState(storedUser);
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

    // 🆕 ── Публичный сеттер пользователя ──
    // Используется в ProfilePage / других местах, где обновился профиль
    // (например, после загрузки аватара).
    // Синхронизирует и React-state, и localStorage.
    const setUser = (nextUser) => {
        setUserState(nextUser);
        persistUser(nextUser);
    };

    // 🆕 Хелпер: пишем пользователя в localStorage,
    // чтобы после перезагрузки страницы данные не «слетали».
    const persistUser = (nextUser) => {
        try {
            if (nextUser) {
                localStorage.setItem('user', JSON.stringify(nextUser));
            } else {
                localStorage.removeItem('user');
            }
        } catch (e) {
            console.warn('Не удалось сохранить пользователя в localStorage:', e);
        }
    };

    // 📌 Вход
    const handleLogin = async (email, password) => {
        setError(null);
        try {
            const userData = await apiLogin(email, password);
            setUser(userData);   // через наш сеттер — сохранит в localStorage
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
            setUser(null);   // через сеттер — заодно чистит localStorage
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
        setUser,             // 🆕 публичный сеттер с автосохранением
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