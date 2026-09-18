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

// ═══════════════════════════════════════════════════════════
//  ДОСКА И ПРОГРЕСС
// ═══════════════════════════════════════════════════════════

// Получить доску задач по публичному коду проекта
export const getTasksBoard = (projectCode) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// Получить прогресс проекта (Kanban-style)
export const getProjectProgress = (projectCode) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/progress`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// ═══════════════════════════════════════════════════════════
//  ЗАДАЧА — CRUD
// ═══════════════════════════════════════════════════════════

// Создать задачу
export const createTask = (projectCode, {
    title, description, columnId, priority, startDate, dueDate
}) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            title, description, columnId, priority, startDate, dueDate
        })
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

// Удалить задачу (только owner)
export const deleteTask = (projectCode, taskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders()
    }).then(async (resp) => {
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка удаления задачи');
        }
        // 204 No Content — тела нет
        return null;
    });

// ═══════════════════════════════════════════════════════════
//  ВЗЯТЬ / СНЯТЬ / ПЕРЕМЕСТИТЬ
// ═══════════════════════════════════════════════════════════

// Взять / присоединиться к задаче
export const takeTask = (projectCode, taskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/take`, {
        method: 'POST',
        headers: authHeaders()
    }).then(handleResponse);

// Снять исполнителя (себя — если email не передан; другого — только owner)
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

// ═══════════════════════════════════════════════════════════
//  КОММЕНТАРИИ
// ═══════════════════════════════════════════════════════════

export const getTaskComments = (projectCode, taskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/comments`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

export const addTaskComment = (projectCode, taskId, text) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text })
    }).then(handleResponse);

// ═══════════════════════════════════════════════════════════
//  ВЛОЖЕНИЯ
// ═══════════════════════════════════════════════════════════

// Загрузить вложение (multipart/form-data)
export const uploadTaskAttachment = async (projectCode, taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const resp = await fetch(
        `${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/attachments`,
        {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        }
    );
    return handleResponse(resp);
};

// Скачать вложение (blob → сохранить как файл)
export const downloadTaskAttachment = async (projectCode, taskId, attachmentId, fileName) => {
    const resp = await fetch(
        `${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/attachments/${attachmentId}/download`,
        { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка скачивания файла');
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

// Удалить вложение
export const deleteTaskAttachment = (projectCode, taskId, attachmentId) =>
    fetch(
        `${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/attachments/${attachmentId}`,
        { method: 'DELETE', headers: authHeaders() }
    ).then(handleResponse);

// ═══════════════════════════════════════════════════════════
//  ПОДЗАДАЧИ
// ═══════════════════════════════════════════════════════════

export const addTaskSubtask = (projectCode, taskId, title) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title })
    }).then(handleResponse);

export const updateTaskSubtask = (projectCode, taskId, subtaskId, title) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ title })
    }).then(handleResponse);

export const toggleTaskSubtask = (projectCode, taskId, subtaskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
        method: 'PATCH',
        headers: authHeaders()
    }).then(handleResponse);

export const deleteTaskSubtask = (projectCode, taskId, subtaskId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: authHeaders()
    }).then(handleResponse);

// ═══════════════════════════════════════════════════════════
//  ТЕГИ ПРОЕКТА
// ═══════════════════════════════════════════════════════════

// Получить все теги проекта
export const getProjectTags = (projectCode) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/tags`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// Создать тег
export const createTag = (projectCode, { name, color }) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/tags`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, color })
    }).then(handleResponse);

// Удалить тег
export const deleteTag = (projectCode, tagId) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/tags/${tagId}`, {
        method: 'DELETE',
        headers: authHeaders()
    }).then(async (resp) => {
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Ошибка удаления тега');
        }
        return null;
    });

// Установить набор тегов на задачу (заменяет текущий)
export const setTaskTags = (projectCode, taskId, tagIds) =>
    fetch(`${API_BASE_URL}/projects/${projectCode}/tasks/${taskId}/tags`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ tagIds })
    }).then(handleResponse);

// Поиск задач по тегам (задача должна содержать ВСЕ переданные)
export const searchTasksByTags = (projectCode, tagIds) => {
    const params = new URLSearchParams();
    tagIds.forEach(id => params.append('tagIds', id));
    return fetch(
        `${API_BASE_URL}/projects/${projectCode}/tasks/search-by-tags?${params.toString()}`,
        { method: 'GET', headers: authHeaders() }
    ).then(handleResponse);
};