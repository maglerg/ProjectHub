// projecthub.client/src/components/MemberCard.js

import React from 'react';
import '../styles/components/MemberCard.css';

const MemberCard = ({ member }) => {
    // Определяем цвет роли
    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'owner': return '#e67e22';
            case 'admin': return '#4a6fa5';
            case 'member': return '#666';
            default: return '#666';
        }
    };

    // Определяем иконку роли
    const getRoleIcon = (role) => {
        switch (role?.toLowerCase()) {
            case 'owner': return '👑';
            case 'admin': return '⚡';
            case 'member': return '👤';
            default: return '👤';
        }
    };

    // Получаем инициалы
    const getInitials = (name) => {
        if (!name) return '👤';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Определяем цвет аватара на основе имени
    const getAvatarColor = (name) => {
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe',
            '#43e97b', '#fa709a', '#fee140', '#f5576c',
            '#4facfe', '#43e97b', '#fa709a'
        ];
        if (!name) return colors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="member-card">
            <div className="member-card-content">
                <div className="member-avatar-wrapper">
                    <div
                        className="member-avatar"
                        style={{ backgroundColor: getAvatarColor(member.name) }}
                    >
                        {getInitials(member.name)}
                    </div>
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
                        📅 Присоединился: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        }) : '—'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberCard;