// projecthub.client/src/components/notes/NoteCard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Folder, Lock, Pin, Trash2, ExternalLink } from 'lucide-react';
import { formatRelativeTime, formatDateTime } from '../../utils/datetime';
import '../../styles/components/notes.css';

// Цвета:
//   свободная заметка — голубая
//   привязанная к проекту — фиолетовая
const COLOR_FREE = '#3b82f6';
const COLOR_PROJECT = '#8b5cf6';

export default function NoteCard({ note, onOpen, onDelete }) {
    const navigate = useNavigate();

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

    // 🆕 Переход к проекту (по публичному коду)
    const handleGoToProject = (e) => {
        e.stopPropagation();   // не открывать заметку
        if (!note.projectCode) return;

        if (note.projectAccessible) {
            // Есть доступ — на дашборд
            navigate(`/projects/${note.projectCode}/dashboard`);
        } else {
            // Нет доступа — на публичную страницу
            navigate(`/projects/${note.projectCode}`);
        }
    };

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
                    <span className="note-card-pin" title="Закреплено">
                        <Pin size={14} fill="currentColor" />
                    </span>
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

            {/* 🆕 Кнопка «Перейти к проекту» — только для проектных заметок */}
            {hasProject && (
                <button
                    type="button"
                    className="note-card-go-project"
                    onClick={handleGoToProject}
                    title={
                        note.projectAccessible
                            ? `Открыть проект «${note.projectName}»`
                            : `Проект «${note.projectName}» — открыть публичную страницу`
                    }
                >
                    <ExternalLink size={12} />
                    Перейти к проекту
                </button>
            )}

            {/* ── Футер ── */}
            <div className="note-card-footer">
                <div className="note-card-meta">
                    <span
                        className="note-card-date"
                        title={formatDateTime(note.updatedAt)}
                    >
                        <Clock size={12} />
                        {formatRelativeTime(note.updatedAt)}
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
                            {note.projectAccessible ? (
                                <Folder size={12} />
                            ) : (
                                <Lock size={12} />
                            )}
                            {note.projectName || 'Проект'}
                        </span>
                    )}
                </div>

                {onDelete && (
                    <button
                        type="button"
                        className="note-card-delete"
                        title="Удалить заметку"
                        aria-label="Удалить заметку"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(note);
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}