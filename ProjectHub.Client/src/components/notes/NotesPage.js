// projecthub.client/src/components/notes/NotesPage.js

import React, { useEffect, useState } from 'react';
import { FileText, Search, RotateCcw, Plus, StickyNote } from 'lucide-react';
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
    { value: 'All', label: 'Все', icon: FileText },
    { value: 'Free', label: 'Свободные', icon: StickyNote }
];

// Сортировка: закреплённые сверху, затем по дате обновления
const sortNotes = (list) =>
    [...list].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

export default function NotesPage() {
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
        <div className="notes-page notes-page--embedded">
            {/* ── Тулбар: фильтры + поиск + кнопка создания ── */}
            <div className="notes-page-toolbar">
                <div className="notes-page-filters">
                    {FILTERS.map(f => {
                        const Icon = f.icon;
                        return (
                            <button
                                key={f.value}
                                type="button"
                                className={`notes-filter-btn ${filter === f.value ? 'active' : ''}`}
                                onClick={() => setFilter(f.value)}
                            >
                                <Icon size={14} />
                                {f.label}
                            </button>
                        );
                    })}
                </div>

                <div className="notes-page-search-row">
                    <form className="notes-page-search" onSubmit={handleSearchSubmit}>
                        <Search size={14} className="notes-page-search-icon" />
                        <input
                            type="text"
                            placeholder="Поиск по заметкам…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button type="submit" className="notes-page-search-btn">
                            Найти
                        </button>
                    </form>

                    {(search || filter !== 'All') && (
                        <button
                            type="button"
                            className="notes-page-reset-btn"
                            onClick={handleReset}
                            title="Сбросить поиск и фильтры"
                        >
                            <RotateCcw size={14} />
                            Сбросить
                        </button>
                    )}

                    {/* 🆕 Кнопка создания — переехала сюда из шапки */}
                    <button
                        type="button"
                        className="btn btn--primary btn--sm notes-page-new-btn"
                        onClick={handleOpenNew}
                    >
                        <Plus size={14} />
                        Новая заметка
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="notes-page-loading">Загрузка…</div>
            ) : error ? (
                <div className="notes-page-error">{error}</div>
            ) : notes.length === 0 ? (
                <div className="notes-page-empty">
                    <div className="notes-page-empty-icon">
                        <StickyNote size={28} />
                    </div>
                    <h3>Заметок пока нет</h3>
                    <p>Создайте первую заметку — она видна только вам</p>
                    <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleOpenNew}
                    >
                        <Plus size={16} />
                        Создать заметку
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