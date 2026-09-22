// projecthub.client/src/components/VotingPage.js

import React, { useState, useEffect, useCallback } from 'react';
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

    // 📌 Показать, кто голосовал
    const [showVoters, setShowVoters] = useState(false);

    // 📌 Загрузка голосования
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
            setVoting(updated);
            setSelectedIds(updated.selectedOptionIds || []);
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
            setVoting(updated);
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
        // Автор — по email
        voting.createdByEmail === user?.email ||
        // Владелец или админ проекта
        projectUserStatus === 'Owner' ||
        projectUserStatus === 'Admin'
    );

    // 📌 Инициал имени для аватарки
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
                                        {/* Клик по верхней части — выбор варианта */}
                                        <div
                                            className="option-control"
                                            onClick={() => canSelect && handleToggleOption(option.id)}
                                        >
                                            <span className={`option-checkbox ${voting.isMultipleChoice ? 'multi' : 'single'}`}>
                                                {isSelected && (voting.isMultipleChoice ? '☑' : '●')}
                                            </span>
                                            <span className="option-text">{option.text}</span>
                                        </div>

                                        {/* Результаты */}
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

                                        {/* Кто голосовал */}
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

                        {/* 📌 Кнопка «Кто голосовал» */}
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