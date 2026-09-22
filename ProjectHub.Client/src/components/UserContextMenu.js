// projecthub.client/src/components/UserContextMenu.js

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    ExternalLink,
    Mail,
    MessageCircle,
    UserPlus,
    Loader2,
    Check,
    X,
    HeartCrack,
    Zap,
    LogOut,
} from 'lucide-react';
import '../styles/components/UserContextMenu.css';

/**
 * Контекстное меню для карточки пользователя.
 *
 * Пропсы:
 *   x, y            — координаты
 *   user            — объект пользователя (email, name, avatarUrl, id)
 *   currentUser     — текущий пользователь (чтобы не показывать действия над собой)
 *   friendStatus    — { status, isFriend, requestId } (опционально)
 *   projectContext  — { projectCode, memberRole, isOwnerViewer, isAdminViewer } (опционально)
 *   onClose         — закрыть меню
 *
 *   Колбэки (если не переданы — пункт скрыт):
 *   onSendMessage(user)
 *   onAddFriend(user)
 *   onCancelRequest(user, requestId)
 *   onAcceptRequest(user, requestId)
 *   onRejectRequest(user, requestId)
 *   onRemoveFriend(user)
 *   onChangeRole(user, newRole)   — newRole: 'Admin' | 'Member'
 *   onRemoveFromProject(user)
 */
const UserContextMenu = ({
    x,
    y,
    user,
    currentUser,
    friendStatus,
    projectContext,
    onClose,
    onSendMessage,
    onAddFriend,
    onCancelRequest,
    onAcceptRequest,
    onRejectRequest,
    onRemoveFriend,
    onChangeRole,
    onRemoveFromProject,
}) => {
    const navigate = useNavigate();
    const menuRef = useRef(null);

    // ── Закрытие по клику вне / Escape / scroll ──
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

    if (!user) return null;

    // ── Не вылезать за края окна ──
    const MENU_WIDTH = 240;
    const MENU_HEIGHT = 420;
    const style = {
        top: Math.min(y, window.innerHeight - MENU_HEIGHT),
        left: Math.min(x, window.innerWidth - MENU_WIDTH),
        position: 'fixed',
    };

    // ── Определяем, мой ли это профиль ──
    const isSelf = !!currentUser && currentUser.email === user.email;

    // ── URL профиля ──
    const buildProfileUrl = () => {
        if (!user?.email) return '';
        return `${window.location.origin}/users/${encodeURIComponent(user.email)}`;
    };

    // ═══════════════════════════════════════════════════════════
    //  ДЕЙСТВИЯ
    // ═══════════════════════════════════════════════════════════

    const handleOpenProfile = () => {
        if (!user.email) return;
        navigate(`/users/${encodeURIComponent(user.email)}`);
        onClose();
    };

    const handleOpenNewTab = () => {
        const url = buildProfileUrl();
        if (!url) return;
        window.open(url, '_blank');
        onClose();
    };

    const handleCopyEmail = async () => {
        if (!user.email) return;
        try {
            await navigator.clipboard.writeText(user.email);
        } catch {
            const el = document.createElement('textarea');
            el.value = user.email;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            el.remove();
        }
        onClose();
    };

    const handleSendMessage = () => {
        if (onSendMessage) onSendMessage(user);
        onClose();
    };

    const handleAddFriend = () => {
        if (onAddFriend) onAddFriend(user);
        onClose();
    };

    const handleCancelRequest = () => {
        if (onCancelRequest && friendStatus?.requestId) {
            onCancelRequest(user, friendStatus.requestId);
        }
        onClose();
    };

    const handleAcceptRequest = () => {
        if (onAcceptRequest && friendStatus?.requestId) {
            onAcceptRequest(user, friendStatus.requestId);
        }
        onClose();
    };

    const handleRejectRequest = () => {
        if (onRejectRequest && friendStatus?.requestId) {
            onRejectRequest(user, friendStatus.requestId);
        }
        onClose();
    };

    const handleRemoveFriend = () => {
        if (onRemoveFriend) onRemoveFriend(user);
        onClose();
    };

    const handleMakeAdmin = () => {
        if (onChangeRole) onChangeRole(user, 'Admin');
        onClose();
    };

    const handleMakeMember = () => {
        if (onChangeRole) onChangeRole(user, 'Member');
        onClose();
    };

    const handleRemoveFromProject = () => {
        if (onRemoveFromProject) onRemoveFromProject(user);
        onClose();
    };

    // ═══════════════════════════════════════════════════════════
    //  ПРАВА И СТАТУСЫ
    // ═══════════════════════════════════════════════════════════

    // Друзья
    const isFriend = !!friendStatus?.isFriend;
    const friendReqStatus = friendStatus?.status;
    const canAddFriend = !isSelf && !isFriend && friendReqStatus !== 'Pending' && friendReqStatus !== 'Received';
    const canCancelRequest = !isSelf && friendReqStatus === 'Pending';
    const canAcceptRequest = !isSelf && friendReqStatus === 'Received';
    const canRejectRequest = !isSelf && friendReqStatus === 'Received';
    const canRemoveFriend = !isSelf && isFriend;

    const hasAnyFriendAction =
        (onAddFriend && canAddFriend) ||
        (onCancelRequest && canCancelRequest) ||
        (onAcceptRequest && canAcceptRequest) ||
        (onRejectRequest && canRejectRequest) ||
        (onRemoveFriend && canRemoveFriend);

    // Управление участником проекта
    const memberRole = projectContext?.memberRole;                 // 'Owner' | 'Admin' | 'Member' | null
    const isViewerOwner = !!projectContext?.isOwnerViewer;
    const isViewerAdmin = !!projectContext?.isAdminViewer;
    const canManageMember = isViewerOwner || isViewerAdmin;

    const canMakeAdmin =
        canManageMember &&
        isViewerOwner &&                                          // назначать админов может только владелец
        memberRole === 'Member';

    const canMakeMember =
        canManageMember &&
        isViewerOwner &&                                          // снимать админов тоже только владелец
        memberRole === 'Admin';

    const canRemoveFromProject =
        canManageMember &&
        memberRole !== 'Owner' &&                                 // владельца не трогаем
        memberRole !== null &&                                    // должен быть участником
        !isSelf;                                                  // себя не удаляем

    const hasAnyProjectAction =
        (onChangeRole && (canMakeAdmin || canMakeMember)) ||
        (onRemoveFromProject && canRemoveFromProject);

    // ── Ничего нет — не показываем пустое меню ──
    const hasAnything =
        user.email ||
        (onSendMessage && !isSelf) ||
        hasAnyFriendAction ||
        hasAnyProjectAction;

    if (!hasAnything) return null;

    // ═══════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div
            ref={menuRef}
            className="user-context-menu"
            style={style}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* ═══ Навигация ═══ */}
            <button
                type="button"
                className="btn btn--ghost btn--sm ucm-item"
                onClick={handleOpenProfile}
            >
                <span className="ucm-icon"><User size={14} /></span>
                Открыть профиль
            </button>

            <button
                type="button"
                className="btn btn--ghost btn--sm ucm-item"
                onClick={handleOpenNewTab}
            >
                <span className="ucm-icon"><ExternalLink size={14} /></span>
                Открыть в новой вкладке
            </button>

            <button
                type="button"
                className="btn btn--ghost btn--sm ucm-item"
                onClick={handleCopyEmail}
            >
                <span className="ucm-icon"><Mail size={14} /></span>
                Копировать email
                <span className="ucm-hint">{user.email}</span>
            </button>

            {/* ═══ Сообщение ═══ */}
            {onSendMessage && !isSelf && (
                <>
                    <div className="ucm-divider" />
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm ucm-item"
                        onClick={handleSendMessage}
                    >
                        <span className="ucm-icon"><MessageCircle size={14} /></span>
                        Отправить сообщение
                    </button>
                </>
            )}

            {/* ═══ Друзья ═══ */}
            {hasAnyFriendAction && (
                <>
                    <div className="ucm-divider" />

                    {onAddFriend && canAddFriend && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item"
                            onClick={handleAddFriend}
                        >
                            <span className="ucm-icon"><UserPlus size={14} /></span>
                            Добавить в друзья
                        </button>
                    )}

                    {onCancelRequest && canCancelRequest && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item"
                            onClick={handleCancelRequest}
                        >
                            <span className="ucm-icon"><Loader2 size={14} /></span>
                            Отменить заявку
                        </button>
                    )}

                    {onAcceptRequest && canAcceptRequest && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item"
                            onClick={handleAcceptRequest}
                        >
                            <span className="ucm-icon"><Check size={14} /></span>
                            Принять заявку
                        </button>
                    )}

                    {onRejectRequest && canRejectRequest && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item"
                            onClick={handleRejectRequest}
                        >
                            <span className="ucm-icon"><X size={14} /></span>
                            Отклонить заявку
                        </button>
                    )}

                    {onRemoveFriend && canRemoveFriend && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item ucm-item--danger"
                            onClick={handleRemoveFriend}
                        >
                            <span className="ucm-icon"><HeartCrack size={14} /></span>
                            Удалить из друзей
                        </button>
                    )}
                </>
            )}

            {/* ═══ Управление участником проекта ═══ */}
            {hasAnyProjectAction && (
                <>
                    <div className="ucm-divider" />

                    {onChangeRole && canMakeAdmin && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item"
                            onClick={handleMakeAdmin}
                        >
                            <span className="ucm-icon"><Zap size={14} /></span>
                            Назначить админом
                        </button>
                    )}

                    {onChangeRole && canMakeMember && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item"
                            onClick={handleMakeMember}
                        >
                            <span className="ucm-icon"><User size={14} /></span>
                            Снять админа
                        </button>
                    )}

                    {onRemoveFromProject && canRemoveFromProject && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm ucm-item ucm-item--danger"
                            onClick={handleRemoveFromProject}
                        >
                            <span className="ucm-icon"><LogOut size={14} /></span>
                            Удалить из проекта
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default UserContextMenu;