import React, { useEffect, useState } from 'react';
import { X, Clock, Folder, Pin, Trash2, Save, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../utils/datetime';
import '../../styles/components/notes.css';

export default function NoteEditorModal({
    note,
    projectCode,
    projectName,
    onClose,
    onSave,
    onDelete
}) {
    const isNew = !note?.id;

    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [color, setColor] = useState(note?.color || '');
    const [isPinned, setIsPinned] = useState(note?.isPinned || false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setTitle(note?.title || '');
        setContent(note?.content || '');
        setColor(note?.color || '');
        setIsPinned(note?.isPinned || false);
    }, [note]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() || saving) return;

        setSaving(true);
        setError(null);
        try {
            await onSave({
                title: title.trim() || null,
                content: content.trim(),
                color: color || null,
                isPinned,
                projectCode: isNew ? projectCode : undefined
            });
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!onDelete) return;
        if (!window.confirm('Удалить заметку? Это действие необратимо.')) return;
        onDelete(note);
    };

    return (
        <div className="note-modal-overlay" onClick={onClose}>
            <div className="note-modal" onClick={e => e.stopPropagation()}>
                <div className="note-modal-header">
                    <div className="note-modal-header-info">
                        <h3>{isNew ? 'Новая заметка' : 'Заметка'}</h3>
                        {!isNew && note?.updatedAt && (
                            <span className="note-modal-saved-at">
                                <Clock size={12} />
                                Сохранено: {formatDateTime(note.updatedAt)}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={onClose}
                        title="Закрыть"
                        aria-label="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>

                {projectName && (
                    <div className="note-modal-project">
                        <Folder size={12} />
                        Привязана к проекту: <b>{projectName}</b>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="note-modal-title"
                        placeholder="Заголовок (опционально)"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={200}
                        autoFocus
                    />

                    <textarea
                        className="note-modal-content"
                        placeholder="Текст заметки…"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={12}
                        maxLength={5000}
                        required
                    />

                    <div className="note-modal-toolbar">
                        <label className="note-modal-color">
                            <input
                                type="color"
                                value={color || '#fbbf24'}
                                onChange={e => setColor(e.target.value)}
                                title="Цвет заметки"
                            />
                            <span>Цвет</span>
                        </label>

                        <label className="note-modal-pin">
                            <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={e => setIsPinned(e.target.checked)}
                            />
                            <Pin size={12} />
                            <span>Закрепить</span>
                        </label>

                        <span className="note-modal-counter">
                            {content.length}/5000
                        </span>
                    </div>

                    {error && (
                        <div className="note-modal-error">{error}</div>
                    )}

                    <div className="note-modal-actions">
                        {!isNew && onDelete && (
                            <button
                                type="button"
                                className="btn btn--danger-outline btn--sm"
                                onClick={handleDelete}
                            >
                                <Trash2 size={14} />
                                Удалить
                            </button>
                        )}
                        <div className="note-modal-actions-right">
                            <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                className="btn btn--primary"
                                disabled={saving || !content.trim()}
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
                </form>
            </div>
        </div>
    );
}