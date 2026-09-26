// projecthub.client/src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    getCurrentUser,
    isAuthenticated,
    getUserFromStorage,
} from '../api/authApi';
import { signalr } from '../services/signalrService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🆕 Ref, чтобы обработчики useEffect видели актуальное значение user
    const userRef = useRef(null);
    useEffect(() => { userRef.current = user; }, [user]);

    // 📌 Загружаем пользователя при старте
    useEffect(() => {
        loadUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 🆕 При размонтировании провайдера — отключаем SignalR
    useEffect(() => {
        return () => {
            signalr.disconnect().catch(() => { });
        };
    }, []);

    const loadUser = async () => {
        setLoading(true);
        try {
            if (isAuthenticated()) {
                const userData = await getCurrentUser();
                if (userData) {
                    setUserState(userData);
                    persistUser(userData);
                    connectSignalR();   // 🆕
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
                        connectSignalR();   // 🆕
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

    // 🆕 Подключение SignalR без блокировки UI.
    // Ошибка подключения не критична — REST всё ещё работает.
    const connectSignalR = async () => {
        try {
            await signalr.connect();
        } catch (err) {
            console.warn('⚠️ SignalR initial connect failed:', err?.message);
        }
    };

    // 🆕 ── Публичный сеттер пользователя ──
    const setUser = (nextUser) => {
        setUserState(nextUser);
        persistUser(nextUser);
    };

    // 🆕 Хелпер: пишем пользователя в localStorage
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
            setUser(userData);

            // 🆕 После успешного логина — подключаем SignalR
            connectSignalR();

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

            // 🆕 После успешной регистрации — подключаем SignalR
            connectSignalR();

            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // 📌 Выход
    const handleLogout = async () => {
        // 🆕 Сначала отключаем SignalR, потом чистим токен
        try {
            await signalr.disconnect();
        } catch (err) {
            console.warn('SignalR disconnect error:', err);
        }

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
        setUser,
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