// projecthub.client/src/components/MemberCard.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import '../styles/components/MemberCard.css';

const MemberCard = ({ member, onRemove }) => {
    const navigate = useNavigate();

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

    // 📌 Обработчик удаления
    const handleRemove = (e) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove();
        }
    };

    return (
        <div className="member-card clickable" onClick={handleCardClick}>
            <div className="member-card-content">
                <div className="member-avatar-wrapper">
                    {/* 🆕 Аватар пользователя */}
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

                {/* 📌 Кнопка удаления (только если есть onRemove) */}
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
    );
};

export default MemberCard;