import { getToken } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';

const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
});

async function handleResponse(resp) {
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка запроса');
    }
    // 204 No Content — не парсим
    if (resp.status === 204) return null;
    return resp.json();
}

// Получить доску задач по публичному коду проекта
export const getTasksBoard = (projectCode) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// Создать задачу
export const createTask = (projectCode, { title, description, columnId }) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, description, columnId })
    }).then(handleResponse);

// Взять задачу
export const takeTask = (projectCode, taskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/take`, {
        method: 'POST',
        headers: authHeaders()
    }).then(handleResponse);

export const leaveTask = (projectCode, taskId, email = null) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/leave`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email })
    }).then(handleResponse);
// Переместить задачу в другую колонку
export const moveTask = (projectCode, taskId, columnId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ columnId })
    }).then(handleResponse);
// Получить задачу по ID
export const getTaskById = (projectCode, taskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// Обновить задачу
export const updateTask = (projectCode, taskId, payload) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload)
    }).then(handleResponse);