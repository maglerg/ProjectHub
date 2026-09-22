// projecthub.client/src/components/ProjectContextMenu.js

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/components/ProjectContextMenu.css';

const ProjectContextMenu = ({
    x,
    y,
    project,
    isFavorite = false,
    onClose,
    onToggleFavorite,
    onEdit,
    onInvite,
    onArchive,
    onUnarchive,
    onDelete,
}) => {
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const closeTimer = useRef(null);

    // ── Одно активное подменю (для быстрых переходов и удаления) ──
    const [openSubmenu, setOpenSubmenu] = useState(null); // null | 'goto'

    // ── Роли ──
    const userStatus = project?.userStatus || 'NotJoined';
    const isOwner = userStatus === 'Owner';
    const isAdmin = userStatus === 'Admin';
    const isMember = isOwner || isAdmin || userStatus === 'Member';
    const isArchived = !!project?.isArchived;

    // ── Права на действия ──
    const canManage = (isOwner || isAdmin) && !isArchived;
    const canOwner = isOwner;
    const canQuickNav = isMember && !isArchived;

    // ── URL проекта ──
    const buildProjectUrl = () => {
        if (!project?.publicCode) return '';
        const path = isMember
            ? `/projects/${project.publicCode}/dashboard`
            : `/projects/${project.publicCode}`;
        return `${window.location.origin}${path}`;
    };

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
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
    }, [onClose]);

    const handleSubmenuOpen = (name) => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setOpenSubmenu(name);
    };

    const handleSubmenuClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => {
            setOpenSubmenu(null);
            closeTimer.current = null;
        }, 120);
    };

    // ── Не вылезать за края окна ──
    const MENU_WIDTH = 260;
    const MENU_HEIGHT = 480;
    const style = {
        top: Math.min(y, window.innerHeight - MENU_HEIGHT),
        left: Math.min(x, window.innerWidth - MENU_WIDTH),
        position: 'fixed',
    };

    // ═══════════════════════════════════════════════════════════
    //  ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════

    const handleOpen = () => {
        if (!project?.publicCode) return;
        if (isArchived && !isMember) return;

        if (isMember) {
            navigate(`/projects/${project.publicCode}/dashboard`);
        } else {
            navigate(`/projects/${project.publicCode}`);
        }
        onClose();
    };

    const handleOpenNewTab = () => {
        const url = buildProjectUrl();
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
        onClose();
    };

    const handleCopyCode = async () => {
        if (!project?.publicCode) return;
        try {
            await navigator.clipboard.writeText(project.publicCode);
        } catch {
            // fallback
            const el = document.createElement('textarea');
            el.value = project.publicCode;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            el.remove();
        }
        onClose();
    };

    const handleCopyLink = async () => {
        const url = buildProjectUrl();
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            el.remove();
        }
        onClose();
    };

    const handleToggleFavorite = () => {
        if (onToggleFavorite) onToggleFavorite(project);
        onClose();
    };

    const handleEdit = () => {
        if (onEdit) onEdit(project);
        onClose();
    };

    const handleInvite = () => {
        if (onInvite) onInvite(project);
        onClose();
    };

    const handleApplications = () => {
        navigate(`/projects/${project.publicCode}/applications`);
        onClose();
    };

    const handleMembers = () => {
        navigate(`/projects/${project.publicCode}/dashboard`, {
            state: { section: 'members' },
        });
        onClose();
    };

    const handleArchive = () => {
        if (onArchive) onArchive(project);
        onClose();
    };

    const handleUnarchive = () => {
        if (onUnarchive) onUnarchive(project);
        onClose();
    };

    const handleDelete = () => {
        if (onDelete) onDelete(project);
        onClose();
    };

    // ── Быстрые переходы ──
    const goTo = (section) => {
        if (!project?.publicCode) return;
        navigate(`/projects/${project.publicCode}/dashboard`, {
            state: { section },
        });
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="project-context-menu"
            style={style}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* ═══ Раздел 1: Навигация ═══ */}
            <button
                type="button"
                className="pcm-item"
                onClick={handleOpen}
                disabled={isArchived && !isMember}
            >
                <span className="pcm-icon">🔗</span>
                Открыть проект
            </button>

            <button
                type="button"
                className="pcm-item"
                onClick={handleOpenNewTab}
                disabled={isArchived && !isMember}
            >
                <span className="pcm-icon">🪟</span>
                Открыть в новой вкладке
            </button>

            <button
                type="button"
                className="pcm-item"
                onClick={handleCopyCode}
            >
                <span className="pcm-icon">📋</span>
                Копировать код
                <span className="pcm-hint">{project?.publicCode}</span>
            </button>

            <button
                type="button"
                className="pcm-item"
                onClick={handleCopyLink}
                disabled={isArchived && !isMember}
            >
                <span className="pcm-icon">🔗</span>
                Копировать ссылку
            </button>

            {/* ═══ Раздел 2: Избранное ═══ */}
            <div className="pcm-divider" />

            <button
                type="button"
                className={`pcm-item ${isFavorite ? 'active' : ''}`}
                onClick={handleToggleFavorite}
            >
                <span className="pcm-icon">{isFavorite ? '⭐' : '☆'}</span>
                {isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            </button>

            {/* ═══ Раздел 3: Управление (Owner/Admin, не в архиве) ═══ */}
            {canManage && (
                <>
                    <div className="pcm-divider" />

                    <button
                        type="button"
                        className="pcm-item"
                        onClick={handleEdit}
                    >
                        <span className="pcm-icon">✏️</span>
                        Редактировать проект
                    </button>

                    <button
                        type="button"
                        className="pcm-item"
                        onClick={handleInvite}
                    >
                        <span className="pcm-icon">📩</span>
                        Пригласить участника
                    </button>

                    <button
                        type="button"
                        className="pcm-item"
                        onClick={handleApplications}
                    >
                        <span className="pcm-icon">📨</span>
                        Заявки на вступление
                    </button>

                    <button
                        type="button"
                        className="pcm-item"
                        onClick={handleMembers}
                    >
                        <span className="pcm-icon">👥</span>
                        Настройки участников
                    </button>
                </>
            )}

            {/* ═══ Раздел 4: Архивация (только Owner) ═══ */}
            {canOwner && (
                <>
                    <div className="pcm-divider" />

                    {!isArchived ? (
                        <button
                            type="button"
                            className="pcm-item"
                            onClick={handleArchive}
                        >
                            <span className="pcm-icon">📦</span>
                            Архивировать проект
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="pcm-item"
                            onClick={handleUnarchive}
                        >
                            <span className="pcm-icon">↩️</span>
                            Восстановить из архива
                        </button>
                    )}

                    {onDelete && (
                        <button
                            type="button"
                            className="pcm-item danger"
                            onClick={handleDelete}
                        >
                            <span className="pcm-icon">🗑</span>
                            Удалить проект
                        </button>
                    )}
                </>
            )}

            {/* ═══ Раздел 5: Быстрые переходы (участники, не в архиве) ═══ */}
            {canQuickNav && (
                <>
                    <div className="pcm-divider" />

                    <div
                        className="pcm-submenu-wrapper"
                        onMouseEnter={() => handleSubmenuOpen('goto')}
                        onMouseLeave={handleSubmenuClose}
                    >
                        <button
                            type="button"
                            className="pcm-item has-submenu"
                        >
                            <span className="pcm-icon">⚡</span>
                            Быстрый переход
                            <span className="pcm-arrow">›</span>
                        </button>

                        {openSubmenu === 'goto' && (
                            <div
                                className="pcm-submenu pcm-submenu--left"
                                onMouseEnter={() => handleSubmenuOpen('goto')}
                                onMouseLeave={handleSubmenuClose}
                            >
                                <button
                                    type="button"
                                    className="pcm-item"
                                    onClick={() => goTo('tasks')}
                                >
                                    <span className="pcm-icon">🗂️</span>
                                    Задачи
                                </button>
                                <button
                                    type="button"
                                    className="pcm-item"
                                    onClick={() => goTo('chat')}
                                >
                                    <span className="pcm-icon">💬</span>
                                    Чат проекта
                                </button>
                                <button
                                    type="button"
                                    className="pcm-item"
                                    onClick={() => goTo('votings')}
                                >
                                    <span className="pcm-icon">🗳️</span>
                                    Голосования
                                </button>
                                <button
                                    type="button"
                                    className="pcm-item"
                                    onClick={() => goTo('timeline')}
                                >
                                    <span className="pcm-icon">📅</span>
                                    Таймлайн
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProjectContextMenu;