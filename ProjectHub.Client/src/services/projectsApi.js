// src/services/projectsApi.js

const API_URL = 'https://localhost:7000/api/projects';

// Получить все проекты
export const fetchAllProjects = async () => {
    const response = await fetch(API_URL);
    if (!response.ok) {
        throw new Error(`Ошибка: ${response.status} - ${response.statusText}`);
    }
    return response.json();
};

// Создать проект
export const createProject = async (projectData) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
    }
    return response.json();
};

// Найти проект по коду
export const searchProjectByCode = async (code) => {
    const cleanCode = code.trim().toUpperCase();
    const response = await fetch(`${API_URL}/code/${cleanCode}`);

    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error('Ошибка поиска проекта');
    }
    return response.json();
};

// Получить проекты с фильтрами
export const fetchProjectsWithFilters = async (category, visibility) => {
    const params = new URLSearchParams();

    if (category && category !== '') {
        params.append('category', category);
    }

    if (visibility && visibility !== '' && visibility !== 'all') {
        const visibilityValue = visibility === 'public' ? 1 : 0;
        params.append('visibility', visibilityValue);
    }

    const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Ошибка: ${response.status} - ${response.statusText}`);
    }
    return response.json();
};