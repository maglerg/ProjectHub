// src/services/projectTagsApi.js

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
    if (resp.status === 204) return null;
    return resp.json();
}

// ═══════════════════════════════════════════════════════════
//  ГЛОБАЛЬНЫЕ ТЕГИ
// ═══════════════════════════════════════════════════════════

// Получить все теги (для автокомплита)
export const getAllProjectTags = ({ search, take = 100 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('take', String(take));

    return fetch(`${API_BASE_URL}/project-tags?${params.toString()}`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);
};

// Создать тег (или получить существующий с таким именем)
export const createProjectTag = ({ name, color }) =>
    fetch(`${API_BASE_URL}/project-tags`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, color })
    }).then(handleResponse);

// Обновить цвет тега (только создатель)
export const updateProjectTag = (tagId, { color }) =>
    fetch(`${API_BASE_URL}/project-tags/${tagId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ color })
    }).then(handleResponse);

// Удалить тег глобально (только создатель)
export const deleteProjectTag = (tagId) =>
    fetch(`${API_BASE_URL}/project-tags/${tagId}`, {
        method: 'DELETE',
        headers: authHeaders()
    }).then(handleResponse);

// ═══════════════════════════════════════════════════════════
//  ТЕГИ КОНКРЕТНОГО ПРОЕКТА
// ═══════════════════════════════════════════════════════════

// Получить теги проекта
export const getProjectTags = (projectCode) =>
    fetch(`${API_BASE_URL}/project-tags/project/${projectCode}`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// Установить набор тегов на проект (заменяет текущий)
export const setProjectTags = (projectCode, tagIds) =>
    fetch(`${API_BASE_URL}/project-tags/project/${projectCode}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ tagIds })
    }).then(handleResponse);

// ═══════════════════════════════════════════════════════════
//  ПОИСК ПРОЕКТОВ ПО ТЕГАМ
// ═══════════════════════════════════════════════════════════

// Поиск публичных проектов по тегам (И — все теги)
export const searchProjectsByTags = (tagIds, take = 100) => {
    const params = new URLSearchParams();
    tagIds.forEach(id => params.append('tagIds', id));
    params.append('take', String(take));

    return fetch(`${API_BASE_URL}/projects/search-by-tags?${params.toString()}`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);
};