// projecthub.client/src/utils/storage.js

// 📌 Генерируем уникальный ID для вкладки (сохраняется в sessionStorage)
const getTabId = () => {
    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
        tabId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('tabId', tabId);
    }
    return tabId;
};

const TAB_ID = getTabId();

// 📌 Уникальный ключ для этой вкладки
const getStorageKey = (baseKey) => {
    return `${baseKey}_${TAB_ID}`;
};

// 📌 Сохраняем значение с уникальным ключом
export const setItem = (key, value) => {
    const storageKey = getStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(value));
};

// 📌 Получаем значение по уникальному ключу
export const getItem = (key) => {
    const storageKey = getStorageKey(key);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

// 📌 Удаляем значение
export const removeItem = (key) => {
    const storageKey = getStorageKey(key);
    localStorage.removeItem(storageKey);
};

// 📌 Очищаем все данные этой вкладки
export const clear = () => {
    // Удаляем все ключи, которые начинаются с нашего tabId
    const prefix = `${TAB_ID}`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(prefix)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
};

// 📌 Специальные методы для токена и пользователя
export const setToken = (token) => setItem('token', token);
export const getToken = () => getItem('token');
export const removeToken = () => removeItem('token');

export const setUser = (user) => setItem('user', user);
export const getUser = () => getItem('user');
export const removeUser = () => removeItem('user');

export const isAuthenticated = () => {
    return !!getToken();
};

// 📌 Получить tabId (для отладки)
export const getTabIdValue = () => TAB_ID;