import React from 'react';
import { formatRelativeTime, formatDateTime } from '../../utils/datetime';
import '../../styles/components/notes.css';

// Цвета:
//   свободная заметка — голубая
//   привязанная к проекту — фиолетовая
const COLOR_FREE = '#3b82f6';
const COLOR_PROJECT = '#8b5cf6';

export default function NoteCard({ note, onOpen, onDelete }) {
    const hasProject = !!note.projectCode;

    // Приоритет: сначала явный note.color (если задан), иначе — по привязке
    const accent = note.color
        ? note.color
        : (hasProject ? COLOR_PROJECT : COLOR_FREE);

    // ── Заголовок: title или первые буквы контента ──
    const title = note.title?.trim()
        ? note.title
        : note.content?.trim().slice(0, 60) || 'Без названия';

    const hasRealTitle = !!note.title?.trim();

    // ── Превью ──
    const preview = hasRealTitle
        ? (note.content || '').trim().slice(0, 200)
        : (note.content || '').trim().slice(60, 260);

    return (
        <div
            className={`note-card ${hasProject ? 'note-card--project' : 'note-card--free'}`}
            style={{ '--note-accent': accent }}
            onClick={() => onOpen(note)}
            role="button"
            tabIndex={0}
        >
            {/* ── Шапка ── */}
            <div className="note-card-header">
                <div className="note-card-header-left">
                    <h4 className="note-card-title" title={title}>
                        {title}
                    </h4>
                </div>

                {note.isPinned && (
                    <span className="note-card-pin" title="Закреплено">📌</span>
                )}
            </div>

            {/* ── Превью ── */}
            {preview ? (
                <p className="note-card-preview">
                    {preview}
                    {preview.length >= 200 ? '…' : ''}
                </p>
            ) : (
                <p className="note-card-preview note-card-preview-empty">
                    Пустая заметка
                </p>
            )}

            {/* ── Футер ── */}
            <div className="note-card-footer">
                <div className="note-card-meta">
                    <span
                        className="note-card-date"
                        title={formatDateTime(note.updatedAt)}
                    >
                        🕒 {formatRelativeTime(note.updatedAt)}
                    </span>

                    {hasProject && (
                        <span
                            className={`note-card-project ${note.projectAccessible ? '' : 'unavailable'}`}
                            title={
                                note.projectAccessible
                                    ? `Проект: ${note.projectName}`
                                    : 'Проект недоступен'
                            }
                        >
                            {note.projectAccessible ? '📁' : '🔒'}{' '}
                            {note.projectName || 'Проект'}
                        </span>
                    )}
                </div>

                {onDelete && (
                    <button
                        type="button"
                        className="note-card-delete"
                        title="Удалить заметку"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(note);
                        }}
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
}