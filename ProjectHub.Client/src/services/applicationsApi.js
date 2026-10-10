// projecthub.client/src/services/applicationsApi.js
import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api
// (или поменяй на http://localhost:8080/api, если фронт запускаешь отдельно).
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// 📌 Подать заявку по коду проекта
export const createApplicationByCode = async (code, message) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/applications/project/code/${code}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка подачи заявки');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в createApplicationByCode:', error);
        throw error;
    }
};

// 📌 Получить заявки проекта
export const getProjectApplications = async (projectId, status) => {
    try {
        const token = getToken();
        const url = status
            ? `${API_BASE_URL}/applications/project/${projectId}?status=${status}`
            : `${API_BASE_URL}/applications/project/${projectId}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения заявок');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getProjectApplications:', error);
        throw error;
    }
};

// 📌 Обработать заявку (принять/отклонить)
export const processApplication = async (applicationId, approve, message) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/process`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ approve, message })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка обработки заявки');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в processApplication:', error);
        throw error;
    }
};

// 📌 Получить заявки проекта по публичному коду
export const getApplicationsByCode = async (code, status) => {
    try {
        const token = getToken();
        const url = status
            ? `${API_BASE_URL}/applications/project/code/${code}?status=${status}`
            : `${API_BASE_URL}/applications/project/code/${code}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения заявок');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в getApplicationsByCode:', error);
        throw error;
    }
};