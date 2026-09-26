// projecthub.client/src/components/VotingsListPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Vote,
    Plus,
    X,
    Loader2,
    Trash2,
    User,
    Calendar,
    Clock,
    Users,
    ListChecks,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjectVotings, deleteVoting } from '../services/votingsApi';
import { searchMyProjectByCode } from '../services/projectsApi';
import { signalr } from '../services/signalrService';
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

    const [deletingId, setDeletingId] = useState(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const [projectData, votingsData] = await Promise.all([
                searchMyProjectByCode(code),
                getProjectVotings(code)
            ]);

            if (!projectData) {
                if (!silent) setError('Проект не найден или у вас нет доступа');
                return;
            }

            setProject(projectData);
            setVotings(votingsData || []);
        } catch (err) {
            console.error('Ошибка загрузки голосований:', err);
            if (!silent) setError(err.message || 'Не удалось загрузить голосования');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [code]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 📌 Принудительное обновление по refreshKey
    useEffect(() => {
        if (refreshKey > 0) {
            loadData(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: только подписки на события голосований.
    //     JoinProject/LeaveProject делает ProjectDashboardPage —
    //     это устраняет race condition при переключении табов.
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (!code) return;

        // ── Новое голосование ──
        const handleVotingCreated = (voting) => {
            if (!voting?.id) return;
            setVotings((prev) => {
                if (prev.some((v) => v.id === voting.id)) return prev;
                return [voting, ...prev];
            });
        };

        // ── Кто-то проголосовал — обновляем голосование в списке ──
        const handleVoteCast = (voting) => {
            if (!voting?.id) return;
            setVotings((prev) =>
                prev.map((v) => (v.id === voting.id ? voting : v))
            );
        };

        // ── Голосование закрыто ──
        const handleVotingClosed = (voting) => {
            if (!voting?.id) return;
            setVotings((prev) =>
                prev.map((v) => (v.id === voting.id ? voting : v))
            );
        };

        // ── Голосование удалено ──
        const handleVotingDeleted = (payload) => {
            const votingId = payload?.votingId;
            if (!votingId) return;
            setVotings((prev) => prev.filter((v) => v.id !== votingId));
        };

        // ── Reconnect — перезагружаем список целиком ──
        const handleReconnected = () => {
            console.log('🔄 SignalR reconnected, refreshing votings list…');
            loadData(true);
        };

        signalr.on('VotingCreated', handleVotingCreated);
        signalr.on('VoteCast', handleVoteCast);
        signalr.on('VotingClosed', handleVotingClosed);
        signalr.on('VotingDeleted', handleVotingDeleted);
        signalr.on('_reconnected', handleReconnected);

        // На случай, если соединение ещё не поднято
        // (JoinProject уже сделал ProjectDashboardPage, но connect() ленивый)
        signalr.connect().catch((err) => {
            console.warn('SignalR connect from VotingsListPage failed:', err);
        });

        return () => {
            signalr.off('VotingCreated', handleVotingCreated);
            signalr.off('VoteCast', handleVoteCast);
            signalr.off('VotingClosed', handleVotingClosed);
            signalr.off('VotingDeleted', handleVotingDeleted);
            signalr.off('_reconnected', handleReconnected);

            // LeaveProject НЕ вызываем — это делает ProjectDashboardPage
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, loadData]);

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

    const canManageVoting = (v) => {
        if (isArchived) return false;
        if (!v || !user) return false;

        const isAuthor = v.createdById === user.id || v.createdById === user.userId;
        const isProjectOwner = project?.userStatus === 'Owner';
        const isProjectAdmin = project?.userStatus === 'Admin';

        return isAuthor || isProjectOwner || isProjectAdmin;
    };

    const handleDelete = async (e, voting) => {
        e.stopPropagation();

        if (isArchived) return;

        if (!window.confirm(`Удалить голосование «${voting.title}»? Это действие необратимо.`)) {
            return;
        }

        setDeletingId(voting.id);
        try {
            await deleteVoting(voting.id);

            // Если SignalR не подключён — обновляем локально.
            // Если подключён — придёт VotingDeleted и всё сделает сам.
            if (!signalr.isConnected()) {
                setVotings((prev) => prev.filter((v) => v.id !== voting.id));
            }
        } catch (err) {
            console.error('Ошибка удаления голосования:', err);
            setError(err.message || 'Не удалось удалить голосование');
            setTimeout(() => setError(null), 3000);
        } finally {
            setDeletingId(null);
        }
    };

    const handleOpenVoting = (votingId) => {
        if (onOpenVoting) {
            onOpenVoting(votingId);
            return;
        }
        navigate(`/projects/${code}/votings/${votingId}`, {
            state: { fromDashboard: embedded, section: 'votings' }
        });
    };

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
                <div className="spinner">
                    <Loader2 size={32} className="icon-spin" />
                </div>
                <p>Загрузка голосований...</p>
            </div>
        );
    }

    if (error && votings.length === 0) {
        return (
            <div className="votings-page-error">
                <div className="error-icon">
                    <X size={32} />
                </div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                {!embedded && (
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => navigate(`/projects/${code}/dashboard`)}
                    >
                        <ArrowLeft size={16} />
                        К проекту
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={embedded ? 'votings-page votings-page--embedded' : 'votings-page'}>
            {!embedded && (
                <header className="votings-page-header">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => navigate(`/projects/${code}/dashboard`)}
                    >
                        <ArrowLeft size={16} />
                        К проекту
                    </button>
                    <div className="votings-page-title">
                        <h1>
                            <Vote size={24} />
                            Голосования
                        </h1>
                        {project && <p className="votings-page-subtitle">{project.name}</p>}
                    </div>
                    {!isArchived && (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={handleCreateVoting}
                        >
                            <Plus size={16} />
                            Создать голосование
                        </button>
                    )}
                </header>
            )}

            <div className="votings-page-content">
                {error && votings.length > 0 && (
                    <div className="form-error" style={{ marginBottom: 16 }}>
                        <X size={14} />
                        {error}
                    </div>
                )}

                {votings.length === 0 ? (
                    <div className="votings-page-empty">
                        <div className="empty-icon">
                            <Vote size={48} />
                        </div>
                        <h3>Пока нет голосований</h3>
                        <p>
                            {isArchived
                                ? 'В архиве нельзя создавать голосования'
                                : 'Создайте первое голосование для участников проекта'}
                        </p>
                        {!isArchived && (
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleCreateVoting}
                            >
                                <Plus size={16} />
                                Создать голосование
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
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (isDeleting) return;
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOpenVoting(v.id);
                                        }
                                    }}
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
                                                    className="btn btn--ghost btn--icon btn--sm"
                                                    onClick={(e) => handleDelete(e, v)}
                                                    disabled={isDeleting}
                                                    title="Удалить голосование"
                                                    aria-label="Удалить голосование"
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 size={14} className="icon-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="voting-card-meta">
                                        <span>
                                            <User size={12} />
                                            {v.createdByName}
                                        </span>
                                        <span>
                                            <Calendar size={12} />
                                            {formatDate(v.createdAt)}
                                        </span>
                                        {v.endsAt && (
                                            <span>
                                                <Clock size={12} />
                                                до {formatDate(v.endsAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="voting-card-footer">
                                        <span>
                                            <ListChecks size={12} />
                                            {v.options.length} вариантов
                                        </span>
                                        <span>
                                            <Users size={12} />
                                            {v.totalVoters} проголосовало
                                        </span>
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