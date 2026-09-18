// projecthub.client/src/components/CreateVotingModal.js

import React, { useState } from 'react';
import { createVoting } from '../services/votingsApi';
import '../styles/components/CreateVotingPage.css';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export default function CreateVotingModal({
    projectCode,
    onClose,
    onCreated        // колбэк: (createdVoting) => void
}) {
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isMultipleChoice, setIsMultipleChoice] = useState(false);
    const [allowRevote, setAllowRevote] = useState(false);
    const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(false);
    const [endsAt, setEndsAt] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

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

            const voting = await createVoting(projectCode, payload);

            if (onCreated) onCreated(voting);
            onClose();
        } catch (err) {
            setError(err.message || 'Не удалось создать голосование');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content modal-content--voting"
                onClick={e => e.stopPropagation()}
            >
                <h3>🗳️ Новое голосование</h3>

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

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={creating}
                        >
                            Отмена
                        </button>
                        <button type="submit" disabled={creating}>
                            {creating ? '⏳ Создание…' : '🗳️ Создать голосование'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}