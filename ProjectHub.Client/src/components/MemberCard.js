// projecthub.client/src/components/MemberCard.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, User, Mail, Calendar, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserContextMenu from './UserContextMenu';
import '../styles/components/MemberCard.css';

const MemberCard = ({
    member,
    isMe = false,
    onRemove,
    friendStatus,
    projectContext,
    onSendMessage,
    onAddFriend,
    onCancelRequest,
    onAcceptRequest,
    onRejectRequest,
    onRemoveFriend,
    onChangeRole,
    onRemoveFromProject,
    // 🆕 Управление отображением онлайн-точки (по умолчанию — показываем)
    showOnline = true,
}) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [contextMenu, setContextMenu] = useState(null);

    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'owner': return '#e67e22';
            case 'admin': return '#4a6fa5';
            case 'member': return '#666';
            default: return '#666';
        }
    };

    const getRoleIcon = (role) => {
        switch (role?.toLowerCase()) {
            case 'owner': return Crown;
            case 'admin': return Zap;
            case 'member': return User;
            default: return User;
        }
    };

    const handleCardClick = () => {
        if (member.email) {
            const encodedEmail = encodeURIComponent(member.email);
            navigate(`/users/${encodedEmail}`);
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove();
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const RoleIcon = getRoleIcon(member.role);

    // 🆕 Показываем точку, если:
    //   • showOnline не отключён явно,
    //   • member.isOnline === true,
    //   • и это не «я сам» (у себя точки нет — это визуальный шум).
    const onlineVisible = showOnline && member.isOnline === true && !isMe;

    return (
        <>
            <div
                className={`member-card clickable ${isMe ? 'is-me' : ''}`}
                onClick={handleCardClick}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick();
                    }
                }}
            >
                <div className="member-card-content">
                    <div className="member-avatar-wrapper">
                        <UserAvatar
                            avatarUrl={member.avatarUrl}
                            name={member.name}
                            email={member.email}
                            size="md"
                        />

                        {/* 🆕 Онлайн-индикатор */}
                        {onlineVisible && (
                            <span
                                className="member-online-dot"
                                title="Онлайн"
                                aria-label="Онлайн"
                            />
                        )}

                        {member.role?.toLowerCase() === 'owner' && (
                            <div className="member-owner-crown">
                                <Crown size={12} />
                            </div>
                        )}
                    </div>

                    <div className="member-info">
                        <div className="member-name-wrapper">
                            <span className="member-name">{member.name || 'Неизвестно'}</span>
                            <span
                                className="member-role-badge"
                                style={{ backgroundColor: getRoleColor(member.role) }}
                            >
                                <RoleIcon size={12} />
                                {member.role || 'Участник'}
                            </span>
                        </div>

                        <div className="member-details">
                            <span className="member-email">
                                <Mail size={12} />
                                {member.email || '—'}
                            </span>
                            <span className="member-specialization">
                                {member.specialization || '—'}
                            </span>
                        </div>

                        <div className="member-joined">
                            <Calendar size={12} />
                            {member.joinedAt
                                ? `Присоединился: ${new Date(member.joinedAt).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })}`
                                : '—'}
                        </div>
                    </div>

                    {onRemove && (
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={handleRemove}
                            title="Удалить"
                            aria-label="Удалить участника"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {contextMenu && (
                <UserContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    user={member}
                    currentUser={currentUser}
                    friendStatus={friendStatus}
                    projectContext={
                        projectContext || (
                            member.role
                                ? {
                                    projectCode: projectContext?.projectCode,
                                    memberRole: member.role,
                                    isOwnerViewer: projectContext?.isOwnerViewer,
                                    isAdminViewer: projectContext?.isAdminViewer,
                                }
                                : undefined
                        )
                    }
                    onClose={() => setContextMenu(null)}
                    onSendMessage={onSendMessage}
                    onAddFriend={onAddFriend}
                    onCancelRequest={onCancelRequest}
                    onAcceptRequest={onAcceptRequest}
                    onRejectRequest={onRejectRequest}
                    onRemoveFriend={onRemoveFriend}
                    onChangeRole={onChangeRole}
                    onRemoveFromProject={onRemoveFromProject}
                />
            )}
        </>
    );
};

export default MemberCard;