// projecthub.client/src/components/RoleManagementModal.js

import React, { useState } from 'react';
import { changeMemberRoleByCodeAndEmail, removeMemberFromProject } from '../services/projectsApi';
import '../styles/components/RoleManagementModal.css';

const RoleManagementModal = ({ project, members, userRole, onClose, onRoleChanged, onMemberRemoved }) => {
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // 📌 Проверяем, может ли пользователь изменять роли (только владелец)
    const canChangeRoles = userRole === 'Owner';

    // 📌 Проверяем, может ли пользователь удалять участников (владелец или админ)
    const canRemoveMembers = userRole === 'Owner' || userRole === 'Admin';

    const handleChangeRole = async (memberEmail, newRole) => {
        setProcessing(memberEmail);
        setError(null);
        setSuccess(null);

        try {
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

    // 📌 Удалить участника из проекта
    const handleRemoveMember = async (memberEmail, memberName) => {
        if (!window.confirm(`Вы уверены, что хотите удалить ${memberName} из проекта?`)) {
            return;
        }

        setProcessing(memberEmail);
        setError(null);
        setSuccess(null);

        try {
            await removeMemberFromProject(project.publicCode, memberEmail);
            setSuccess(`✅ ${memberName} удален из проекта`);
            setTimeout(() => setSuccess(null), 3000);

            if (onMemberRemoved) {
                onMemberRemoved();
            }
        } catch (err) {
            setError(err.message || 'Ошибка удаления участника');
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

    // 📌 Определяем, можно ли удалять этого участника
    const canRemoveMember = (member) => {
        // Нельзя удалить владельца
        if (member.role === 'Owner') {
            console.log(`❌ Нельзя удалить владельца: ${member.name}`);
            return false;
        }

        // Если пользователь — админ
        if (userRole === 'Admin') {
            // Админ не может удалять других админов
            if (member.role === 'Admin') {
                console.log(`❌ Админ не может удалять админа: ${member.name}`);
                return false;
            }
            // Админ может удалять только участников (Member)
            console.log(`✅ Админ может удалить участника: ${member.name}`);
            return true;
        }

        // Владелец может удалять всех (кроме себя)
        if (userRole === 'Owner') {
            // Владелец не может удалить себя
            // Находим себя в списке участников
            const currentUser = members.find(m => m.role === 'Owner');
            if (currentUser && currentUser.email === member.email) {
                console.log(`❌ Владелец не может удалить себя`);
                return false;
            }
            console.log(`✅ Владелец может удалить: ${member.name}`);
            return true;
        }

        return false;
    };

    // Фильтруем участников (исключаем владельца из списка)
    const filteredMembers = members.filter(m => m.role !== 'Owner');

    // 📌 Для отладки: выводим информацию
    console.log('🔍 RoleManagementModal:');
    console.log('  userRole:', userRole);
    console.log('  canRemoveMembers:', canRemoveMembers);
    console.log('  members:', members);
    console.log('  filteredMembers:', filteredMembers);

    return (
        <div className="role-modal-overlay" onClick={onClose}>
            <div className="role-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="role-modal-header">
                    <h2>👥 Управление участниками</h2>
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
                        filteredMembers.map(member => {
                            const canRemove = canRemoveMember(member);
                            console.log(`  ${member.name} (${member.role}): canRemove=${canRemove}`);

                            return (
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
                                        {/* 📌 Кнопка изменения роли (только для владельца) */}
                                        {canChangeRoles && (
                                            member.role === 'Admin' ? (
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
                                            )
                                        )}

                                        {/* 📌 Кнопка удаления участника */}
                                        {canRemoveMembers && canRemove && (
                                            <button
                                                className="btn-remove-member"
                                                onClick={() => handleRemoveMember(member.email, member.name)}
                                                disabled={processing === member.email}
                                                title="Удалить из проекта"
                                            >
                                                {processing === member.email ? '⏳' : '🗑️'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
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