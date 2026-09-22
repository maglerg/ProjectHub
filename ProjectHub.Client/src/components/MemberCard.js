// projecthub.client/src/components/MemberCard.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserContextMenu from './UserContextMenu';
import '../styles/components/MemberCard.css';

const MemberCard = ({
    member,
    onRemove,
    // 🆕 Опциональные пропсы для контекстного меню
    friendStatus,             // { status, isFriend, requestId }
    projectContext,           // { projectCode, memberRole, isOwnerViewer, isAdminViewer }
    onSendMessage,
    onAddFriend,
    onCancelRequest,
    onAcceptRequest,
    onRejectRequest,
    onRemoveFriend,
    onChangeRole,             // (user, newRole) => void
    onRemoveFromProject,
}) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    // 🆕 Контекстное меню
    const [contextMenu, setContextMenu] = useState(null); // { x, y }

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
            case 'owner': return '👑';
            case 'admin': return '⚡';
            case 'member': return '👤';
            default: return '👤';
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

    // 🆕 Правый клик — открыть контекстное меню
    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <>
            <div
                className="member-card clickable"
                onClick={handleCardClick}
                onContextMenu={handleContextMenu}
            >
                <div className="member-card-content">
                    <div className="member-avatar-wrapper">
                        <UserAvatar
                            avatarUrl={member.avatarUrl}
                            name={member.name}
                            email={member.email}
                            size="md"
                        />
                        {member.role?.toLowerCase() === 'owner' && (
                            <div className="member-owner-crown">👑</div>
                        )}
                    </div>

                    <div className="member-info">
                        <div className="member-name-wrapper">
                            <span className="member-name">{member.name || 'Неизвестно'}</span>
                            <span
                                className="member-role-badge"
                                style={{ backgroundColor: getRoleColor(member.role) }}
                            >
                                {getRoleIcon(member.role)} {member.role || 'Участник'}
                            </span>
                        </div>

                        <div className="member-details">
                            <span className="member-email">📧 {member.email || '—'}</span>
                            <span className="member-specialization">
                                {member.specialization || '—'}
                            </span>
                        </div>

                        <div className="member-joined">
                            📅 {member.joinedAt ?
                                `Присоединился: ${new Date(member.joinedAt).toLocaleDateString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })}`
                                : '—'}
                        </div>
                    </div>

                    {onRemove && (
                        <button
                            className="member-remove-btn"
                            onClick={handleRemove}
                            title="Удалить"
                        >
                            ✕
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
                            // если карточка в контексте проекта — соберём контекст из member.role
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