import React, { useState } from 'react';

export default function CreateTaskModal({ columns, onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [columnId, setColumnId] = useState(columns[0]?.id || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setSubmitting(true);
        try {
            await onCreate({
                title: title.trim(),
                description: description.trim() || null,
                columnId
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>Создать задачу</h3>

                <form onSubmit={handleSubmit}>
                    <label>
                        Название *
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={255}
                            autoFocus
                            required
                        />
                    </label>

                    <label>
                        Описание
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                        />
                    </label>

                    <label>
                        Блок
                        <select value={columnId} onChange={e => setColumnId(e.target.value)}>
                            {columns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </label>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={submitting}>
                            Отмена
                        </button>
                        <button type="submit" disabled={submitting || !title.trim()}>
                            {submitting ? 'Создание…' : 'Создать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}