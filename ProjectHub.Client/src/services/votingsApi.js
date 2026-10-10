// projecthub.client/src/services/votingsApi.js

import { getToken } from '../utils/storage';

// В Docker при сборке REACT_APP_API_URL=/api (относительный путь).
// Локально без Docker — fallback на http://localhost:3000/api.
const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// 📌 Создать голосование в проекте
export const createVoting = async (projectCode, votingData) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/project/${projectCode}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(votingData)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка создания голосования');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в createVoting:', error);
        throw error;
    }
};

// 📌 Получить все голосования проекта
export const getProjectVotings = async (projectCode) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/project/${projectCode}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения голосований');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в getProjectVotings:', error);
        throw error;
    }
};

// 📌 Краткая сводка (для бейджа)
export const getVotingsSummary = async (projectCode) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/project/${projectCode}/summary`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения сводки');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в getVotingsSummary:', error);
        throw error;
    }
};

// 📌 Получить одно голосование
export const getVotingById = async (votingId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/${votingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка получения голосования');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в getVotingById:', error);
        throw error;
    }
};

// 📌 Проголосовать
export const vote = async (votingId, optionIds) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/${votingId}/vote`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ optionIds })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка голосования');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в vote:', error);
        throw error;
    }
};

// 📌 Закрыть голосование
export const closeVoting = async (votingId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/${votingId}/close`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка закрытия');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Ошибка в closeVoting:', error);
        throw error;
    }
};

// 📌 Удалить голосование
export const deleteVoting = async (votingId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/votings/${votingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка удаления');
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка в deleteVoting:', error);
        throw error;
    }
};