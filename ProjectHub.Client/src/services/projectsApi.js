// projecthub.client/src/services/projectsApi.js

const API_BASE_URL = 'https://localhost:7000/api';

// 📌 Получить все проекты
export const fetchAllProjects = async () => {
    try {
        const token = localStorage.getItem('token');
        console.log('🔑 Токен:', token ? 'Есть' : 'Нет');

        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📡 Статус ответа:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('❌ Ошибка ответа:', error);
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Получены данные:', data);

        if (!Array.isArray(data)) {
            console.error('❌ Ожидался массив, получено:', data);
            return [];
        }

        return data;
    } catch (error) {
        console.error('❌ Ошибка в fetchAllProjects:', error);
        throw error;
    }
};

// 📌 Получить проекты с фильтрами
export const fetchProjectsWithFilters = async (category, visibility, status) => {
    try {
        const token = localStorage.getItem('token');
        let url = `${API_BASE_URL}/projects/filter?`;

        if (category) url += `category=${category}&`;
        if (visibility) url += `visibility=${visibility}&`;
        if (status) url += `status=${status}&`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error('❌ Ожидался массив, получено:', data);
            return [];
        }

        return data;
    } catch (error) {
        console.error('❌ Ошибка в fetchProjectsWithFilters:', error);
        throw error;
    }
};

// 📌 Поиск проекта по коду
export const searchProjectByCode = async (code) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/search/${code}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в searchProjectByCode:', error);
        throw error;
    }
};

// 📌 Создать новый проект
export const createProject = async (projectData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: projectData.name,
                description: projectData.description || '',
                category: projectData.category,
                visibility: projectData.visibility,
                deadline: projectData.deadline
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка создания проекта');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в createProject:', error);
        throw error;
    }
};

// 📌 Получить проект по ID
export const fetchProjectById = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в fetchProjectById:', error);
        throw error;
    }
};

// 📌 Обновить проект
export const updateProject = async (id, projectData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в updateProject:', error);
        throw error;
    }
};

// 📌 Удалить проект
export const deleteProject = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка в deleteProject:', error);
        throw error;
    }
};