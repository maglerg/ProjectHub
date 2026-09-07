// projecthub.client/src/utils/storage.js

// 📌 Генерируем уникальный ID для вкладки
// Сохраняем его в sessionStorage, чтобы он жил только в этой вкладке
const getTabId = () => {
    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
        tabId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('tabId', tabId);
    }
    return tabId;
};

const TAB_ID = getTabId();

// 📌 Хранилище с поддержкой tabId
export const setItem = (key, value) => {
    const data = {
        value: value,
        tabId: TAB_ID,
        timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(data));
};

export const getItem = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
        const data = JSON.parse(raw);
        // ✅ Если данные принадлежат этой вкладке — возвращаем
        if (data.tabId && data.tabId === TAB_ID) {
            return data.value;
        }
        // ❌ Если данные от другой вкладки — игнорируем
        return null;
    } catch {
        return null;
    }
};

export const removeItem = (key) => {
    localStorage.removeItem(key);
};

export const clear = () => {
    localStorage.clear();
};

// 📌 Специальные методы для токена и пользователя
export const setToken = (token) => setItem('token', token);
export const getToken = () => getItem('token');
export const removeToken = () => removeItem('token');

export const setUser = (user) => setItem('user', user);
export const getUser = () => getItem('user');
export const removeUser = () => removeItem('user');

export const isAuthenticated = () => !!getToken();