// projecthub.client/src/services/projectsApi.js
import { getToken } from '../utils/storage';

const API_BASE_URL = 'https://localhost:7000/api';
// 📌 Добавить/удалить из избранного по публичному коду
export const toggleFavoriteByCode = async (code) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/${code}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка изменения избранного');
        }

        const data = await response.json();
        return data.isFavorite;
    } catch (error) {
        console.error('❌ Ошибка в toggleFavoriteByCode:', error);
        throw error;
    }
};
// 📌 Изменить роль участника по публичному коду и email
export const changeMemberRoleByCodeAndEmail = async (projectCode, memberEmail, newRole) => {
    try {
        const token = getToken();
        const encodedEmail = encodeURIComponent(memberEmail);
        const response = await fetch(`${API_BASE_URL}/projects/code/${projectCode}/members/${encodedEmail}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newRole })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка изменения роли');
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка в changeMemberRoleByCodeAndEmail:', error);
        throw error;
    }
};
export const getProjectHistory = async (
    projectCode,
    { type, relatedEntityId, skip = 0, take = 50 } = {}
) => {
    const token = getToken();
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (relatedEntityId) params.append('relatedEntityId', relatedEntityId);
    params.append('skip', String(skip));
    params.append('take', String(take));

    const response = await fetch(
        `${API_BASE_URL}/projects/${projectCode}/history?${params.toString()}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка загрузки истории');
    }

    return response.json();
};
// 📌 Получить мои проекты (где пользователь владелец или участник)
export const fetchMyProjects = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/my`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения моих проектов');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в fetchMyProjects:', error);
        throw error;
    }
};
// 📌 Получить избранные проекты
export const fetchFavorites = async () => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/favorites`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка получения избранных проектов');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в fetchFavorites:', error);
        throw error;
    }
};

// 📌 Получить все проекты (с опциональными фильтрами)
// 📌 Получить все проекты (с опциональными фильтрами)
export const fetchAllProjects = async (favoritesOnly = false, category = null) => {
    try {
        const token = getToken();
        const params = new URLSearchParams();

        if (favoritesOnly) params.append('favoritesOnly', 'true');
        if (category) params.append('category', category);

        const query = params.toString();
        const url = `${API_BASE_URL}/projects${query ? `?${query}` : ''}`;

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
        console.error('❌ Ошибка в fetchAllProjects:', error);
        throw error;
    }
};


// 📌 Получить проекты с фильтрами
export const fetchProjectsWithFilters = async (category, visibility, status) => {
    try {
        const token = getToken();
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

// 📌 Поиск проекта по коду (только публичные)
export const searchProjectByCode = async (code) => {
    try {
        const token = getToken();
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

// 📌 Поиск проекта по коду для участников (включая приватные)
export const searchMyProjectByCode = async (code) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/search/my/${code}`, {
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
        console.error('❌ Ошибка в searchMyProjectByCode:', error);
        throw error;
    }
};
// 📌 Получить участников проекта
export const fetchProjectMembers = async (projectId) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
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
        console.error('❌ Ошибка в fetchProjectMembers:', error);
        throw error;
    }
};
// 📌 Создать новый проект
export const createProject = async (projectData) => {
    try {
        const token = getToken();
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

// 📌 Присоединиться к проекту по коду
export const joinProject = async (code) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/join/${code}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка присоединения к проекту');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в joinProject:', error);
        throw error;
    }
};

// 📌 Обновить проект по публичному коду
export const updateProject = async (code, projectData) => {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/projects/code/${code}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Ошибка в updateProject:', error);
        throw error;
    }
};
// 📌 Удалить участника из проекта по публичному коду и email
export const removeMemberFromProject = async (projectCode, memberEmail) => {
    try {
        const token = getToken();
        const encodedEmail = encodeURIComponent(memberEmail);
        const response = await fetch(`${API_BASE_URL}/projects/code/${projectCode}/members/${encodedEmail}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Ошибка удаления участника');
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка в removeMemberFromProject:', error);
        throw error;
    }
};
// 📌 Удалить проект
export const deleteProject = async (id) => {
    try {
        const token = getToken();
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