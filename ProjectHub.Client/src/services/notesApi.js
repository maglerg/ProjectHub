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

// Получить список моих заметок
// filter: 'All' | 'Free' | 'Project'
// projectCode: для filter = 'Project'
// search: строка поиска
export const getNotes = ({ filter = 'All', projectCode, search } = {}) => {
    const params = new URLSearchParams();
    params.append('filter', filter);
    if (projectCode) params.append('projectCode', projectCode);
    if (search) params.append('search', search);

    return fetch(`${API_BASE_URL}/notes?${params.toString()}`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);
};

// Получить одну заметку
export const getNoteById = (noteId) =>
    fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: 'GET',
        headers: authHeaders()
    }).then(handleResponse);

// Создать заметку
export const createNote = ({ title, content, projectCode, color } = {}) =>
    fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, content, projectCode, color })
    }).then(handleResponse);

// Обновить заметку
export const updateNote = (noteId, { title, content, color, isPinned } = {}) =>
    fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ title, content, color, isPinned })
    }).then(handleResponse);

// Привязать к проекту / отвязать (projectCode = null)
export const attachNoteToProject = (noteId, projectCode) =>
    fetch(`${API_BASE_URL}/notes/${noteId}/project`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ projectCode })
    }).then(handleResponse);

// Удалить заметку
export const deleteNote = (noteId) =>
    fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: authHeaders()
    }).then((resp) => {
        if (!resp.ok && resp.status !== 204) {
            return resp.json().catch(() => ({})).then(err => {
                throw new Error(err.error || 'Ошибка удаления заметки');
            });
        }
        return null;
    });