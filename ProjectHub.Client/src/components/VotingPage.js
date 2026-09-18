// projecthub.client/src/components/VotingPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVotingById, vote, closeVoting, deleteVoting } from '../services/votingsApi';
import { searchMyProjectByCode } from '../services/projectsApi';
import '../styles/components/VotingPage.css';

const VotingPage = () => {
    const { code, votingId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // 📌 Пришли ли мы с дашборда (чтобы вернуться на нужный раздел)
    const fromDashboard = location.state?.fromDashboard === true;

    const [project, setProject] = useState(null);
    const [voting, setVoting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // 📌 Показать, кто голосовал
    const [showVoters, setShowVoters] = useState(false);

    // 📌 Универсальный возврат:
    //   — если пришли с дашборда → возвращаемся на дашборд с активным разделом "votings"
    //   — иначе → на страницу списка голосований
    const goBack = () => {
        if (fromDashboard) {
            navigate(`/projects/${code}/dashboard`, {
                state: { section: 'votings' }
            });
        } else {
            navigate(`/projects/${code}/votings`);
        }
    };

    const loadVoting = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projectData, votingData] = await Promise.all([
                searchMyProjectByCode(code),
                getVotingById(votingId)
            ]);
            setProject(projectData);
            setVoting(votingData);
            setSelectedIds(votingData.selectedOptionIds || []);
        } catch (err) {
            console.error('Ошибка загрузки голосования:', err);
            setError(err.message || 'Не удалось загрузить голосование');
        } finally {
            setLoading(false);
        }
    }, [code, votingId]);

    useEffect(() => {
        loadVoting();
    }, [loadVoting]);

    useEffect(() => {
        if (voting?.isAnonymous) setShowVoters(false);
    }, [voting?.isAnonymous]);

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
            goBack();
        } catch (err) {
            setError(err.message || 'Не удалось удалить');
        } finally {
            setSubmitting(false);
        }
    };

    const userStatus = project?.userStatus;
    const canManage = voting && (
        // Автор — сравнение по email, если id нет
        voting.createdByEmail === user?.email ||
        // Владелец или админ проекта
        userStatus === 'Owner' ||
        userStatus === 'Admin'
    );

    // 📌 Инициал имени для аватарки
    const getInitial = (name) => {
        if (!name) return '👤';
        return name.trim().charAt(0).toUpperCase();
    };

    if (loading) {
        return (
            <div className="votings-page-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка голосования...</p>
            </div>
        );
    }

    if (error && !voting) {
        return (
            <div className="votings-page-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={goBack}>
                    ← К голосованиям
                </button>
            </div>
        );
    }

    if (!voting) return null;

    return (
        <div className="voting-page">
            <header className="voting-page-header">
                <button className="btn-back" onClick={goBack}>
                    ← К голосованиям
                </button>
                <div className="voting-page-title">
                    <h1>🗳️ Голосование</h1>
                    {project && <p className="votings-page-subtitle">{project.name}</p>}
                </div>
            </header>

            <div className="voting-page-content">
                {error && <div className="form-error">❌ {error}</div>}

                <div className="voting-page-card">
                    <h2 className="voting-question">{voting.title}</h2>

                    <div className="voting-meta">
                        <span>👤 {voting.createdByName}</span>
                        {voting.isClosed && <span className="badge closed">🔒 Закрыто</span>}
                        {voting.isExpired && !voting.isClosed && <span className="badge expired">⏰ Истекло</span>}
                        {voting.isMultipleChoice && <span className="badge info">☑️ Мультивыбор</span>}
                        {voting.allowRevote && isActive && <span className="badge info">🔁 Можно переголосовать</span>}
                        {voting.isAnonymous && (
                            <span className="badge anonymous">Анонимное</span>
                        )}
                    </div>

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

                                    {showVoters && canSeeResults && !voting.isAnonymous && voters.length > 0 && (
                                        <div className="option-voters">
                                            {voters.map(voter => (
                                                <div key={voter.userId} className="voter-item">
                                                    <span className="voter-avatar">
                                                        {getInitial(voter.name)}
                                                    </span>
                                                    <span className="voter-name">{voter.name}</span>
                                                    <span className="voter-date">
                                                        {new Date(voter.votedAt).toLocaleDateString('ru-RU', {
                                                            day: '2-digit', month: '2-digit',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            ))}
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
                            👥 Проголосовало: {voting.totalVoters} из {voting.totalProjectMembers}
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
                            className="btn-show-voters"
                            onClick={() => setShowVoters(v => !v)}
                        >
                            {showVoters ? '🙈 Скрыть, кто голосовал' : '👥 Показать, кто голосовал'}
                        </button>
                    )}

                    <div className="voting-actions">
                        {isActive && (
                            <button
                                className="btn-primary"
                                onClick={handleVote}
                                disabled={submitting || selectedIds.length === 0}
                            >
                                {submitting
                                    ? '⏳'
                                    : voting.hasVoted
                                        ? '🔁 Переголосовать'
                                        : '🗳️ Проголосовать'}
                            </button>
                        )}

                        {canManage && !voting.isClosed && (
                            <button
                                className="btn-secondary"
                                onClick={handleClose}
                                disabled={submitting}
                            >
                                🔒 Закрыть
                            </button>
                        )}

                        {canManage && (
                            <button
                                className="btn-danger"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                🗑️ Удалить
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VotingPage;