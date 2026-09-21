import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getNotes,
    createNote,
    updateNote,
    deleteNote
} from '../../services/notesApi';
import NoteCard from './NoteCard';
import NoteEditorModal from './NoteEditorModal';
import '../../styles/components/notes.css';

const FILTERS = [
    { value: 'All', label: '📋 Все' },
    { value: 'Free', label: '🗒️ Свободные' }
];

// ── Сортировка: закреплённые сверху, затем по дате обновления ──
const sortNotes = (list) =>
    [...list].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

export default function NotesPage() {
    const navigate = useNavigate();

    const [notes, setNotes] = useState([]);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    const loadNotes = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getNotes({ filter, search });
            setNotes(sortNotes(data));
        } catch (e) {
            console.error('❌ Ошибка загрузки заметок:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadNotes();
    };

    const handleReset = async () => {
        setFilter('All');
        setSearch('');

        setLoading(true);
        setError(null);
        try {
            const data = await getNotes({ filter: 'All', search: '' });
            setNotes(sortNotes(data));
        } catch (e) {
            console.error('❌ Ошибка загрузки заметок:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenNew = () => {
        setEditingNote(null);
        setEditorOpen(true);
    };

    const handleOpenExisting = (note) => {
        setEditingNote(note);
        setEditorOpen(true);
    };

    const handleSave = async (payload) => {
        if (editingNote?.id) {
            const updated = await updateNote(editingNote.id, payload);
            setNotes(prev =>
                sortNotes(prev.map(n => (n.id === updated.id ? updated : n)))
            );
        } else {
            const created = await createNote(payload);
            setNotes(prev => sortNotes([created, ...prev]));
        }
        setEditorOpen(false);
        setEditingNote(null);
    };

    const handleDelete = async (note) => {
        await deleteNote(note.id);
        setNotes(prev => prev.filter(n => n.id !== note.id));
        setEditorOpen(false);
        setEditingNote(null);
    };

    return (
        <div className="notes-page">
            <header className="notes-page-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Назад
                </button>
                <div className="notes-page-title-block">
                    <h1>📝 Мои заметки</h1>
                    <p className="notes-page-subtitle">
                        Видны только вам. Заметки можно привязать к проекту.
                    </p>
                </div>
                <button className="btn-primary" onClick={handleOpenNew}>
                    + Новая заметка
                </button>
            </header>

            <div className="notes-page-toolbar">
                <div className="notes-page-filters">
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            type="button"
                            className={`notes-filter-btn ${filter === f.value ? 'active' : ''}`}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="notes-page-search-row">
                    <form className="notes-page-search" onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            placeholder="Поиск по заметкам…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button type="submit" className="notes-page-search-btn">🔍</button>
                    </form>

                    {(search || filter !== 'All') && (
                        <button
                            type="button"
                            className="notes-page-reset-btn"
                            onClick={handleReset}
                            title="Сбросить поиск и фильтры"
                        >
                            ↺ Сбросить
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="notes-page-loading">Загрузка…</div>
            ) : error ? (
                <div className="notes-page-error">{error}</div>
            ) : notes.length === 0 ? (
                <div className="notes-page-empty">
                    <div className="notes-page-empty-icon">📝</div>
                    <h3>Заметок пока нет</h3>
                    <p>Создайте первую заметку — она видна только вам</p>
                    <button className="btn-primary" onClick={handleOpenNew}>
                        + Создать заметку
                    </button>
                </div>
            ) : (
                <div className="notes-page-grid">
                    {notes.map(n => (
                        <NoteCard
                            key={n.id}
                            note={n}
                            onOpen={handleOpenExisting}
                            onDelete={(note) => {
                                if (window.confirm('Удалить заметку?')) handleDelete(note);
                            }}
                        />
                    ))}
                </div>
            )}

            {editorOpen && (
                <NoteEditorModal
                    note={editingNote}
                    onClose={() => {
                        setEditorOpen(false);
                        setEditingNote(null);
                    }}
                    onSave={handleSave}
                    onDelete={editingNote ? handleDelete : null}
                />
            )}
        </div>
    );
}