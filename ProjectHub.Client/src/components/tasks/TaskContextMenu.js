import React, { useEffect, useRef, useState } from 'react';
import { TASK_PRIORITIES } from '../../utils/constants';

export default function TaskContextMenu({
    x, y,
    task, columns, currentUserEmail, isOwner, projectCode,
    onClose,
    onOpen, onEdit, onTake, onLeave, onMove, onPriority, onDelete
}) {
    const menuRef = useRef(null);

    const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
    const [showPrioritySubmenu, setShowPrioritySubmenu] = useState(false);

    const assignees = task.assignees || [];
    const emailLower = (currentUserEmail || '').toLowerCase();
    const isMine = assignees.some(
        a => (a.email || '').toLowerCase() === emailLower
    );
    const isTaken = assignees.length > 0;
    const canEdit = !!task.canEdit;
    const canDelete = isOwner;

    // ── Закрытие по клику вне, Escape, скроллу ──
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        const handleScroll = () => onClose();

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    // ── Не вылезать за края окна ──
    const MENU_WIDTH = 240;
    const MENU_HEIGHT = 340;
    const style = {
        top: Math.min(y, window.innerHeight - MENU_HEIGHT),
        left: Math.min(x, window.innerWidth - MENU_WIDTH),
        position: 'fixed'
    };

    // ── Копирование ссылки ──
    const handleCopyLink = async () => {
        const url = `${window.location.origin}/projects/${projectCode}/tasks/${task.id}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch (err) {
            // Fallback для старых браузеров
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            el.remove();
        }
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="task-context-menu"
            style={style}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}
        >
            {/* Открыть */}
            <button
                type="button"
                className="context-menu-item"
                onClick={() => { onOpen(); onClose(); }}
            >
                <span className="context-menu-icon">🔗</span>
                Открыть задачу
            </button>

            {/* Редактировать */}
            {canEdit && (
                <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => { onEdit(); onClose(); }}
                >
                    <span className="context-menu-icon">✏️</span>
                    Редактировать
                </button>
            )}

            <div className="context-menu-divider" />

            {/* Взять / Присоединиться / Снять */}
            {!isMine && (
                <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => { onTake(); onClose(); }}
                >
                    <span className="context-menu-icon">🤝</span>
                    {isTaken ? 'Присоединиться' : 'Взять задачу'}
                </button>
            )}

            {isMine && (
                <button
                    type="button"
                    className="context-menu-item danger"
                    onClick={() => { onLeave(); onClose(); }}
                >
                    <span className="context-menu-icon">↩️</span>
                    Снять с себя
                </button>
            )}

            {/* Переместить в... (подменю) */}
            {(canEdit || isOwner) && (
                <div
                    className="context-menu-submenu-wrapper"
                    onMouseEnter={() => setShowMoveSubmenu(true)}
                    onMouseLeave={() => setShowMoveSubmenu(false)}
                >
                    <button
                        type="button"
                        className="context-menu-item has-submenu"
                    >
                        <span className="context-menu-icon">📁</span>
                        Переместить в…
                        <span className="context-menu-arrow">›</span>
                    </button>

                    {showMoveSubmenu && (
                        <div className="context-submenu context-submenu--left">
                            {columns
                                .filter(c => c.id !== task.columnId)
                                .map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className="context-menu-item"
                                        onClick={() => { onMove(c.id); onClose(); }}
                                    >
                                        {c.name}
                                    </button>
                                ))
                            }
                        </div>
                    )}
                </div>
            )}

            {/* Изменить приоритет (подменю) */}
            {canEdit && (
                <div
                    className="context-menu-submenu-wrapper"
                    onMouseEnter={() => setShowPrioritySubmenu(true)}
                    onMouseLeave={() => setShowPrioritySubmenu(false)}
                >
                    <button
                        type="button"
                        className="context-menu-item has-submenu"
                    >
                        <span className="context-menu-icon">🚩</span>
                        Приоритет
                        <span className="context-menu-arrow">›</span>
                    </button>

                    {showPrioritySubmenu && (
                        <div className="context-submenu context-submenu--left">
                            {TASK_PRIORITIES.map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    className={`context-menu-item ${task.priority === p.value ? 'active' : ''
                                        }`}
                                    onClick={() => { onPriority(p.value); onClose(); }}
                                >
                                    <span className="context-menu-icon">{p.icon}</span>
                                    {p.label}
                                    {task.priority === p.value && (
                                        <span className="context-menu-check">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="context-menu-divider" />

            {/* Копировать ссылку */}
            <button
                type="button"
                className="context-menu-item"
                onClick={handleCopyLink}
            >
                <span className="context-menu-icon">📋</span>
                Копировать ссылку
            </button>

            {/* Удалить (только owner) */}
            {canDelete && (
                <>
                    <div className="context-menu-divider" />
                    <button
                        type="button"
                        className="context-menu-item danger"
                        onClick={() => { onDelete(); onClose(); }}
                    >
                        <span className="context-menu-icon">🗑️</span>
                        Удалить задачу
                    </button>
                </>
            )}
        </div>
    );
}