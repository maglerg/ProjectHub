// projecthub.client/src/components/CreateVotingPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createVoting } from '../services/votingsApi';
import { searchMyProjectByCode } from '../services/projectsApi';
import '../styles/components/CreateVotingPage.css';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

const CreateVotingPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [loadingProject, setLoadingProject] = useState(true);

    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    const [allowRevote, setAllowRevote] = useState(false);
    const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(false);
    const [endsAt, setEndsAt] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // 📌 Загружаем проект
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await searchMyProjectByCode(code);
                if (!mounted) return;
                if (!data) {
                    setError('Проект не найден или у вас нет доступа');
                } else {
                    setProject(data);
                }
            } catch (err) {
                if (!mounted) return;
                setError(err.message || 'Не удалось загрузить проект');
            } finally {
                if (mounted) setLoadingProject(false);
            }
        })();
        return () => { mounted = false; };
    }, [code]);

    const handleOptionChange = (index, value) => {
        setOptions(prev => prev.map((o, i) => i === index ? value : o));
    };

    const handleAddOption = () => {
        if (options.length >= MAX_OPTIONS) return;
        setOptions(prev => [...prev, '']);
    };

    const handleRemoveOption = (index) => {
        if (options.length <= MIN_OPTIONS) return;
        setOptions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const trimmedTitle = title.trim();
        const trimmedOptions = options.map(o => o.trim()).filter(o => o);

        if (!trimmedTitle) {
            setError('Введите название голосования');
            return;
        }
        if (trimmedOptions.length < MIN_OPTIONS) {
            setError(`Нужно минимум ${MIN_OPTIONS} варианта`);
            return;
        }
        if (new Set(trimmedOptions).size !== trimmedOptions.length) {
            setError('Варианты не должны повторяться');
            return;
        }

        setCreating(true);
        try {
            const payload = {
                title: trimmedTitle,
                options: trimmedOptions,
                isMultipleChoice,
                allowRevote,
                showResultsBeforeVote,
                isAnonymous,
                endsAt: endsAt ? new Date(endsAt).toISOString() : null
            };

            const voting = await createVoting(code, payload);
            navigate(`/projects/${code}/votings/${voting.id}`);
        } catch (err) {
            setError(err.message || 'Не удалось создать голосование');
        } finally {
            setCreating(false);
        }
    };

    if (loadingProject) {
        return (
            <div className="votings-page-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка...</p>
            </div>
        );
    }

    return (
        <div className="create-voting-page">
            <header className="create-voting-page-header">
                <button
                    className="btn-back"
                    onClick={() => navigate(`/projects/${code}/votings`)}
                >
                    ← К голосованиям
                </button>
                <div className="create-voting-page-title">
                    <h1>🗳️ Новое голосование</h1>
                    {project && <p className="votings-page-subtitle">{project.name}</p>}
                </div>
            </header>

            <div className="create-voting-page-content">
                <form onSubmit={handleSubmit} className="create-voting-form">
                    {error && <div className="form-error">❌ {error}</div>}

                    <div className="form-group">
                        <label>Вопрос голосования *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Например: Куда идём на тимбилдинг?"
                            maxLength={500}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            Варианты ответа *
                            <span className="options-count">
                                {options.length}/{MAX_OPTIONS}
                            </span>
                        </label>

                        <div className="options-list">
                            {options.map((option, index) => (
                                <div key={index} className="option-row">
                                    <span className="option-number">{index + 1}.</span>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={e => handleOptionChange(index, e.target.value)}
                                        placeholder={`Вариант ${index + 1}`}
                                        maxLength={300}
                                    />
                                    <button
                                        type="button"
                                        className="btn-remove-option"
                                        onClick={() => handleRemoveOption(index)}
                                        disabled={options.length <= MIN_OPTIONS}
                                        title="Удалить вариант"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="btn-add-option"
                            onClick={handleAddOption}
                            disabled={options.length >= MAX_OPTIONS}
                        >
                            ➕ Добавить вариант
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={isMultipleChoice}
                                onChange={e => setIsMultipleChoice(e.target.checked)}
                            />
                            <span>Можно выбрать несколько вариантов</span>
                        </label>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowRevote}
                                onChange={e => setAllowRevote(e.target.checked)}
                            />
                            <span>Разрешить переголосовать</span>
                        </label>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showResultsBeforeVote}
                                onChange={e => setShowResultsBeforeVote(e.target.checked)}
                            />
                            <span>Показывать результаты до голосования</span>
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                            />
                            <span>Анонимное голосование</span>
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Дата окончания (опционально)</label>
                        <input
                            type="datetime-local"
                            value={endsAt}
                            onChange={e => setEndsAt(e.target.value)}
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => navigate(`/projects/${code}/votings`)}
                            disabled={creating}
                        >
                            Отмена
                        </button>
                        <button type="submit" className="btn-primary" disabled={creating}>
                            {creating ? '⏳ Создание...' : '🗳️ Создать голосование'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateVotingPage;