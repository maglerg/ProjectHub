// components/notes/NotesPanel.jsx
import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, Save, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { getNotes, createNote, updateNote } from '../../services/notesApi';
import { formatDateTime } from '../../utils/datetime';
import '../../styles/components/notes.css';

export default function NotesPanel({ projectCode, projectName }) {
    const [note, setNote] = useState(null);   // одна заметка (или null)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);

    const titleRef = useRef(null);
    const contentRef = useRef(null);

    // ── Загрузка единственной заметки проекта ──
    const loadNote = async () => {
        setLoading(true);
        setError(null);
        try {
            const notes = await getNotes({
                filter: 'Project',
                projectCode
            });

            // Берём первую — их должно быть не больше одной
            const found = notes?.[0] || null;
            setNote(found);

            setTitle(found?.title || '');
            setContent(found?.content || '');
            setSavedAt(found?.updatedAt || null);
        } catch (e) {
            console.error('❌ Ошибка загрузки заметки:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectCode) loadNote();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectCode]);

    // ── Определяем «есть ли изменения» ──
    const hasChanges =
        (title || '') !== (note?.title || '') ||
        (content || '') !== (note?.content || '');

    // ── Клик по документу — ставим курсор ──
    const focusContent = () => contentRef.current?.focus();
    const focusTitle = () => titleRef.current?.focus();

    // ── Сохранение ──
    const handleSave = async () => {
        if (saving || !content.trim()) return;

        setSaving(true);
        setError(null);
        try {
            let updated;

            if (note?.id) {
                // Обновляем существующую
                updated = await updateNote(note.id, {
                    title: title.trim() || null,
                    content: content.trim(),
                    color: note.color,
                    isPinned: note.isPinned
                });
            } else {
                // Создаём первую заметку для проекта
                updated = await createNote({
                    title: title.trim() || null,
                    content: content.trim(),
                    projectCode
                });
            }

            setNote(updated);
            setTitle(updated.title || '');
            setContent(updated.content || '');
            setSavedAt(updated.updatedAt);
        } catch (e) {
            console.error('❌ Ошибка сохранения заметки:', e);
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="notes-doc-loading">Загрузка заметки…</div>;
    }

    return (
        <div className="notes-doc-panel">
            <header className="notes-doc-panel-header">
                <div>
                    <h2>
                        <StickyNote size={20} />
                        Моя заметка
                    </h2>
                    <p className="notes-doc-panel-subtitle">
                        Видна только вам. Проект: <b>{projectName}</b>
                    </p>
                </div>
            </header>

            {error && (
                <div className="notes-doc-error">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        aria-label="Закрыть"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="note-doc">
                {/* ── Заголовок ── */}
                <input
                    ref={titleRef}
                    type="text"
                    className="note-doc-title"
                    placeholder="Заголовок"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onClick={focusTitle}
                    maxLength={200}
                />

                {/* ── Тело ── */}
                <textarea
                    ref={contentRef}
                    className="note-doc-content"
                    placeholder="Начните писать свои мысли по этому проекту…"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onClick={focusContent}
                    maxLength={5000}
                    rows={Math.max(12, Math.ceil((content?.length || 0) / 80) + 2)}
                />

                {/* ── Футер ── */}
                <div className="note-doc-footer">
                    <div className="note-doc-meta">
                        {savedAt && !hasChanges && (
                            <span className="note-doc-saved-at">
                                <Check size={12} />
                                Сохранено: {formatDateTime(savedAt)}
                            </span>
                        )}
                        {hasChanges && (
                            <span className="note-doc-unsaved">
                                Есть несохранённые изменения
                            </span>
                        )}
                        {!savedAt && !hasChanges && (
                            <span className="note-doc-hint">
                                Заметка ещё не сохранена
                            </span>
                        )}
                    </div>

                    <div className="note-doc-actions">
                        <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={handleSave}
                            disabled={saving || !content.trim() || !hasChanges}
                            title={
                                !hasChanges
                                    ? 'Нет изменений для сохранения'
                                    : 'Сохранить заметку'
                            }
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={14} className="icon-spin" />
                                    Сохранение…
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    Сохранить
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}