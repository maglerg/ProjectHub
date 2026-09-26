// projecthub.client/src/components/VotingPage.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Vote,
    X,
    Loader2,
    User,
    Lock,
    Clock,
    CheckSquare,
    RotateCcw,
    Users,
    Eye,
    EyeOff,
    Vote as VoteIcon,
    Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getVotingById, vote, closeVoting, deleteVoting } from '../services/votingsApi';
import { signalr } from '../services/signalrService';
import '../styles/components/VotingPage.css';

export default function VotingPage({
    votingId,
    projectUserStatus,
    onClose,
    onChanged,
}) {
    const { user } = useAuth();

    const [voting, setVoting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [showVoters, setShowVoters] = useState(false);

    // 🆕 Refs — чтобы обработчики SignalR видели актуальные значения
    const votingIdRef = useRef(votingId);
    useEffect(() => { votingIdRef.current = votingId; }, [votingId]);

    // 🆕 Храним projectCode для JoinProject
    const projectCodeRef = useRef(null);

    const loadVoting = useCallback(async () => {
        if (!votingId) {
            setLoading(false);
            setError('Не указан id голосования');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await getVotingById(votingId);
            setVoting(data);
            setSelectedIds(data.selectedOptionIds || []);
            projectCodeRef.current = data.projectCode;
        } catch (err) {
            console.error('Ошибка загрузки голосования:', err);
            setError(err.message || 'Не удалось загрузить голосование');
        } finally {
            setLoading(false);
        }
    }, [votingId]);

    useEffect(() => {
        loadVoting();
    }, [loadVoting]);

    // 📌 Сброс «кто голосовал» для анонимных
    useEffect(() => {
        if (voting?.isAnonymous) setShowVoters(false);
    }, [voting?.isAnonymous]);

    // 📌 Закрытие по Escape
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && onClose) onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR: подписки на события голосования
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const projectCode = projectCodeRef.current;
        if (!projectCode || !votingId) return;

        let cancelled = false;

        // ── Обновление голосования (VoteCast, VotingClosed) ──
        const handleVotingUpdated = (updated) => {
            if (!updated?.id || updated.id !== votingIdRef.current) return;

            setVoting(updated);
            setSelectedIds(updated.selectedOptionIds || []);

            // Внешний колбэк — обновить список голосований на дашборде
            if (onChanged) onChanged();
        };

        // ── Голосование удалено ──
        const handleVotingDeleted = (payload) => {
            if (payload?.votingId !== votingIdRef.current) return;

            setError('Голосование удалено');
            if (onChanged) onChanged();

            setTimeout(() => {
                if (onClose) onClose();
            }, 1500);
        };

        // ── Reconnect ──
        const handleReconnected = () => {
            if (projectCodeRef.current) {
                signalr.invoke('JoinProject', projectCodeRef.current).catch(() => { });
            }
            loadVoting();
        };

        signalr.on('VoteCast', handleVotingUpdated);
        signalr.on('VotingClosed', handleVotingUpdated);
        signalr.on('VotingDeleted', handleVotingDeleted);
        signalr.on('_reconnected', handleReconnected);

        (async () => {
            try {
                await signalr.connect();
                if (cancelled) return;
                await signalr.invoke('JoinProject', projectCode);
            } catch (err) {
                console.warn('SignalR: не удалось присоединиться к проекту:', err);
            }
        })();

        return () => {
            cancelled = true;

            signalr.off('VoteCast', handleVotingUpdated);
            signalr.off('VotingClosed', handleVotingUpdated);
            signalr.off('VotingDeleted', handleVotingDeleted);
            signalr.off('_reconnected', handleReconnected);

            if (projectCodeRef.current) {
                signalr.invoke('LeaveProject', projectCodeRef.current).catch(() => { });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [votingId, voting?.projectCode]);   // ← зависим от projectCode, когда он станет известен

    const isActive = voting && !voting.isClosed && !voting.isExpired;
    const canSeeResults = voting && (
        voting.hasVoted ||
        !isActive ||
        voting.showResultsBeforeVote
    );

    const handleToggleOption = (optionId) => {
        if (!voting || !isActive) return;
        if (voting.isMultipleChoice) {
            setSelectedIds(prev =>
                prev.includes(optionId)
                    ? prev.filter(id => id !== optionId)
                    : [...prev, optionId]
            );
        } else {
            setSelectedIds([optionId]);
        }
    };

    const handleVote = async () => {
        if (!voting || selectedIds.length === 0) return;
        setSubmitting(true);
        setError(null);
        try {
            const updated = await vote(voting.id, selectedIds);

            // Если SignalR не подключён — обновляем локально.
            // Если подключён — придёт VoteCast и всё сделает сам.
            if (!signalr.isConnected()) {
                setVoting(updated);
                setSelectedIds(updated.selectedOptionIds || []);
            }
            if (onChanged) onChanged();
        } catch (err) {
            setError(err.message || 'Не удалось проголосовать');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = async () => {
        if (!voting) return;
        if (!window.confirm('Закрыть голосование? Переголосовать будет нельзя.')) return;
        setSubmitting(true);
        try {
            const updated = await closeVoting(voting.id);
            if (!signalr.isConnected()) {
                setVoting(updated);
            }
            if (onChanged) onChanged();
        } catch (err) {
            setError(err.message || 'Не удалось закрыть');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!voting) return;
        if (!window.confirm('Удалить голосование? Это действие необратимо.')) return;
        setSubmitting(true);
        try {
            await deleteVoting(voting.id);
            if (onChanged) onChanged();
            if (onClose) onClose();
        } catch (err) {
            setError(err.message || 'Не удалось удалить');
        } finally {
            setSubmitting(false);
        }
    };

    const canManage = voting && (
        voting.createdByEmail === user?.email ||
        projectUserStatus === 'Owner' ||
        projectUserStatus === 'Admin'
    );

    const getInitial = (name) => {
        if (!name) return null;
        return name.trim().charAt(0).toUpperCase();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content modal-content--voting-view"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header-row">
                    <h3>
                        <Vote size={20} />
                        Голосование
                    </h3>
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={onClose}
                        title="Закрыть"
                        aria-label="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>

                {loading ? (
                    <div className="votings-page-loading">
                        <div className="spinner">
                            <Loader2 size={32} className="icon-spin" />
                        </div>
                        <p>Загрузка голосования...</p>
                    </div>
                ) : error && !voting ? (
                    <div className="form-error">
                        <X size={14} />
                        {error}
                    </div>
                ) : !voting ? null : (
                    <div className="voting-page-card voting-page-card--modal">
                        <h2 className="voting-question">{voting.title}</h2>

                        <div className="voting-meta">
                            <span>
                                <User size={14} />
                                {voting.createdByName}
                            </span>
                            {voting.isClosed && (
                                <span className="badge closed">
                                    <Lock size={12} />
                                    Закрыто
                                </span>
                            )}
                            {voting.isExpired && !voting.isClosed && (
                                <span className="badge expired">
                                    <Clock size={12} />
                                    Истекло
                                </span>
                            )}
                            {voting.isMultipleChoice && (
                                <span className="badge info">
                                    <CheckSquare size={12} />
                                    Мультивыбор
                                </span>
                            )}
                            {voting.allowRevote && isActive && (
                                <span className="badge info">
                                    <RotateCcw size={12} />
                                    Можно переголосовать
                                </span>
                            )}
                            {voting.isAnonymous && (
                                <span className="badge anonymous">Анонимное</span>
                            )}
                        </div>

                        {error && (
                            <div className="form-error">
                                <X size={14} />
                                {error}
                            </div>
                        )}

                        <div className="voting-options">
                            {voting.options.map(option => {
                                const isSelected = selectedIds.includes(option.id);
                                const canSelect = isActive;
                                const voters = option.voters || [];

                                return (
                                    <div
                                        key={option.id}
                                        className={`voting-option ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                                    >
                                        <div
                                            className="option-control"
                                            onClick={() => canSelect && handleToggleOption(option.id)}
                                        >
                                            <span className={`option-checkbox ${voting.isMultipleChoice ? 'multi' : 'single'}`}>
                                                {isSelected && (voting.isMultipleChoice ? '☑' : '●')}
                                            </span>
                                            <span className="option-text">{option.text}</span>
                                        </div>

                                        {canSeeResults && (
                                            <div className="option-results">
                                                <div className="results-bar">
                                                    <div
                                                        className="results-fill"
                                                        style={{ width: `${option.percent}%` }}
                                                    />
                                                </div>
                                                <div className="results-info">
                                                    <span>{option.votesCount} голос(ов)</span>
                                                    <span className="results-percent">{option.percent}%</span>
                                                </div>
                                            </div>
                                        )}

                                        {showVoters && canSeeResults && !voting.isAnonymous && voters.length > 0 && (
                                            <div className="option-voters">
                                                {voters.map(voter => {
                                                    const initial = getInitial(voter.name);
                                                    return (
                                                        <div key={voter.userId} className="voter-item">
                                                            <span className="voter-avatar">
                                                                {initial ?? <User size={14} />}
                                                            </span>
                                                            <span className="voter-name">{voter.name}</span>
                                                            <span className="voter-date">
                                                                {new Date(voter.votedAt).toLocaleDateString('ru-RU', {
                                                                    day: '2-digit', month: '2-digit',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {showVoters && canSeeResults && !voting.isAnonymous && voters.length === 0 && (
                                            <div className="option-voters empty">
                                                <span className="voter-empty">Пока никто не голосовал</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {canSeeResults ? (
                            <div className="voting-summary">
                                <Users size={14} />
                                Проголосовало: {voting.totalVoters} из {voting.totalProjectMembers}
                            </div>
                        ) : (
                            <div className="voting-summary muted">
                                Результаты появятся после голосования
                            </div>
                        )}

                        {canSeeResults && !voting.isAnonymous && (
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => setShowVoters(v => !v)}
                            >
                                {showVoters ? (
                                    <>
                                        <EyeOff size={14} />
                                        Скрыть, кто голосовал
                                    </>
                                ) : (
                                    <>
                                        <Eye size={14} />
                                        Показать, кто голосовал
                                    </>
                                )}
                            </button>
                        )}

                        <div className="voting-actions">
                            {isActive && (
                                <button
                                    type="button"
                                    className="btn btn--primary"
                                    onClick={handleVote}
                                    disabled={submitting || selectedIds.length === 0}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="icon-spin" />
                                            Голосование…
                                        </>
                                    ) : voting.hasVoted ? (
                                        <>
                                            <RotateCcw size={16} />
                                            Переголосовать
                                        </>
                                    ) : (
                                        <>
                                            <VoteIcon size={16} />
                                            Проголосовать
                                        </>
                                    )}
                                </button>
                            )}

                            {canManage && !voting.isClosed && (
                                <button
                                    type="button"
                                    className="btn btn--secondary"
                                    onClick={handleClose}
                                    disabled={submitting}
                                >
                                    <Lock size={16} />
                                    Закрыть
                                </button>
                            )}

                            {canManage && (
                                <button
                                    type="button"
                                    className="btn btn--danger-outline"
                                    onClick={handleDelete}
                                    disabled={submitting}
                                >
                                    <Trash2 size={16} />
                                    Удалить
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}