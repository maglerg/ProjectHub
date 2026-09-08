// projecthub.client/src/components/RoleManagementModal.js

import React, { useState } from 'react';
import { changeMemberRoleByCodeAndEmail } from '../services/projectsApi';
import '../styles/components/RoleManagementModal.css';

const RoleManagementModal = ({ project, members, onClose, onRoleChanged }) => {
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChangeRole = async (memberEmail, newRole) => {
        setProcessing(memberEmail);
        setError(null);
        setSuccess(null);

        try {
            // ✅ Используем publicCode вместо project.id
            await changeMemberRoleByCodeAndEmail(project.publicCode, memberEmail, newRole);
            setSuccess(`Роль успешно изменена!`);
            setTimeout(() => setSuccess(null), 3000);

            if (onRoleChanged) {
                onRoleChanged();
            }
        } catch (err) {
            setError(err.message || 'Ошибка изменения роли');
            setTimeout(() => setError(null), 3000);
        } finally {
            setProcessing(null);
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'Owner': return '👑 Владелец';
            case 'Admin': return '⚡ Администратор';
            case 'Member': return '👤 Участник';
            default: return role;
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'Owner': return '#e67e22';
            case 'Admin': return '#4a6fa5';
            case 'Member': return '#666';
            default: return '#666';
        }
    };

    // Фильтруем участников (исключаем владельца)
    const filteredMembers = members.filter(m => m.role !== 'Owner');

    return (
        <div className="role-modal-overlay" onClick={onClose}>
            <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="role-modal-header">
                    <h2>👥 Управление ролями</h2>
                    <button className="role-modal-close" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div className="role-modal-error">{error}</div>
                )}
                {success && (
                    <div className="role-modal-success">{success}</div>
                )}

                <div className="role-modal-body">
                    {filteredMembers.length === 0 ? (
                        <p className="role-modal-empty">Нет участников для управления</p>
                    ) : (
                        filteredMembers.map(member => (
                            <div key={member.userId} className="role-member-item">
                                <div className="role-member-info">
                                    <div className="role-member-avatar">
                                        {member.name ? member.name[0].toUpperCase() : '👤'}
                                    </div>
                                    <div className="role-member-details">
                                        <span className="role-member-name">{member.name}</span>
                                        <span className="role-member-email">{member.email}</span>
                                    </div>
                                    <span
                                        className="role-member-current"
                                        style={{ backgroundColor: getRoleColor(member.role) }}
                                    >
                                        {getRoleLabel(member.role)}
                                    </span>
                                </div>
                                <div className="role-member-actions">
                                    {member.role === 'Admin' ? (
                                        <button
                                            className="btn-role-remove-admin"
                                            onClick={() => handleChangeRole(member.email, 'Member')}
                                            disabled={processing === member.email}
                                        >
                                            {processing === member.email ? '⏳' : '⬇️ Снять админа'}
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-role-make-admin"
                                            onClick={() => handleChangeRole(member.email, 'Admin')}
                                            disabled={processing === member.email}
                                        >
                                            {processing === member.email ? '⏳' : '⬆️ Назначить админом'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="role-modal-footer">
                    <button className="btn-role-close" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
};

export default RoleManagementModal;