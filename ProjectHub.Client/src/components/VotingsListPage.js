// projecthub.client/src/components/VotingsListPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectVotings, deleteVoting } from '../services/votingsApi';
import { searchMyProjectByCode } from '../services/projectsApi';
import '../styles/components/VotingsListPage.css';

const VotingsListPage = ({
    embedded = false,
    refreshKey = 0,
    onOpenVoting,
    onCreateVoting,
    isArchived = false,
}) => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [votings, setVotings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 📌 id удаляемого голосования (для спиннера на кнопке)
    const [deletingId, setDeletingId] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projectData, votingsData] = await Promise.all([
                searchMyProjectByCode(code),
                getProjectVotings(code)
            ]);

            if (!projectData) {
                setError('Проект не найден или у вас нет доступа');
                return;
            }

            setProject(projectData);
            setVotings(votingsData || []);
        } catch (err) {
            console.error('Ошибка загрузки голосований:', err);
            setError(err.message || 'Не удалось загрузить голосования');
        } finally {
            setLoading(false);
        }
    }, [code]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 📌 Принудительное обновление по refreshKey
    useEffect(() => {
        if (refreshKey > 0) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const getVotingStatus = (v) => {
        if (v.isClosed) return { label: 'Закрыто', className: 'closed' };
        if (v.isExpired) return { label: 'Истекло', className: 'expired' };
        if (v.hasVoted) return { label: 'Вы проголосовали', className: 'voted' };
        return { label: 'Активно', className: 'active' };
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    // 📌 Может ли текущий пользователь управлять голосованием
    // 📦 В архиве — никто не может удалять
    const canManageVoting = (v) => {
        if (isArchived) return false;
        if (!v || !user) return false;

        const isAuthor = v.createdById === user.id || v.createdById === user.userId;
        const isProjectOwner = project?.userStatus === 'Owner';
        const isProjectAdmin = project?.userStatus === 'Admin';

        return isAuthor || isProjectOwner || isProjectAdmin;
    };

    // 📌 Удалить голосование
    const handleDelete = async (e, voting) => {
        e.stopPropagation();

        if (isArchived) return;   // 📦 архив — не удаляем

        if (!window.confirm(`Удалить голосование «${voting.title}»? Это действие необратимо.`)) {
            return;
        }

        setDeletingId(voting.id);
        try {
            await deleteVoting(voting.id);
            setVotings(prev => prev.filter(v => v.id !== voting.id));
        } catch (err) {
            console.error('Ошибка удаления голосования:', err);
            setError(err.message || 'Не удалось удалить голосование');
            setTimeout(() => setError(null), 3000);
        } finally {
            setDeletingId(null);
        }
    };

    // 📌 Открыть голосование
    //   — если передан onOpenVoting, вызываем его (обычно открывает модалку),
    //   — иначе fallback — переход на отдельную страницу.
    const handleOpenVoting = (votingId) => {
        if (onOpenVoting) {
            onOpenVoting(votingId);
            return;
        }
        navigate(`/projects/${code}/votings/${votingId}`, {
            state: { fromDashboard: embedded, section: 'votings' }
        });
    };

    // 📌 Создать голосование
    // 📦 В архиве — запрещено
    const handleCreateVoting = () => {
        if (isArchived) return;
        if (onCreateVoting) {
            onCreateVoting();
            return;
        }
        navigate(`/projects/${code}/votings/new`, {
            state: { fromDashboard: embedded, section: 'votings' }
        });
    };

    if (loading) {
        return (
            <div className="votings-page-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка голосований...</p>
            </div>
        );
    }

    if (error && votings.length === 0) {
        return (
            <div className="votings-page-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                {!embedded && (
                    <button className="btn-back" onClick={() => navigate(`/projects/${code}/dashboard`)}>
                        ← К проекту
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={embedded ? 'votings-page votings-page--embedded' : 'votings-page'}>
            {/* ── Шапка (только в standalone-режиме) ── */}
            {!embedded && (
                <header className="votings-page-header">
                    <button
                        className="btn-back"
                        onClick={() => navigate(`/projects/${code}/dashboard`)}
                    >
                        ← К проекту
                    </button>
                    <div className="votings-page-title">
                        <h1>🗳️ Голосования</h1>
                        {project && <p className="votings-page-subtitle">{project.name}</p>}
                    </div>
                    {!isArchived && (
                        <button
                            className="btn-primary btn-create-voting-page"
                            onClick={handleCreateVoting}
                        >
                            ➕ Создать голосование
                        </button>
                    )}
                </header>
            )}

            <div className="votings-page-content">
                {error && votings.length > 0 && (
                    <div className="form-error" style={{ marginBottom: 16 }}>
                        ❌ {error}
                    </div>
                )}

                {votings.length === 0 ? (
                    <div className="votings-page-empty">
                        <div className="empty-icon">🗳️</div>
                        <h3>Пока нет голосований</h3>
                        <p>
                            {isArchived
                                ? 'В архиве нельзя создавать голосования'
                                : 'Создайте первое голосование для участников проекта'}
                        </p>
                        {!isArchived && (
                            <button
                                className="btn-primary"
                                onClick={handleCreateVoting}
                            >
                                ➕ Создать голосование
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="votings-page-list">
                        {votings.map(v => {
                            const status = getVotingStatus(v);
                            const canDelete = canManageVoting(v);
                            const isDeleting = deletingId === v.id;

                            return (
                                <div
                                    key={v.id}
                                    className="voting-card-page"
                                    onClick={() => !isDeleting && handleOpenVoting(v.id)}
                                >
                                    <div className="voting-card-header">
                                        <div className="voting-title">{v.title}</div>
                                        <div className="voting-card-header-right">
                                            <span className={`voting-status ${status.className}`}>
                                                {status.label}
                                            </span>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    className="btn-delete-voting"
                                                    onClick={(e) => handleDelete(e, v)}
                                                    disabled={isDeleting}
                                                    title="Удалить голосование"
                                                >
                                                    {isDeleting ? '⏳' : '🗑️'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="voting-card-meta">
                                        <span>👤 {v.createdByName}</span>
                                        <span>📅 {formatDate(v.createdAt)}</span>
                                        {v.endsAt && <span>⏰ до {formatDate(v.endsAt)}</span>}
                                    </div>
                                    <div className="voting-card-footer">
                                        <span>🗳️ {v.options.length} вариантов</span>
                                        <span>👥 {v.totalVoters} проголосовало</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VotingsListPage;