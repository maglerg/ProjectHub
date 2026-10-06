// src/components/AccentPicker.jsx

import React from 'react';
import { Check, Palette } from 'lucide-react';
import { useAccent } from '../hooks/useAccent';
import '../styles/components/AccentPicker.css';

export default function AccentPicker() {
    const { accentId, accents, setAccent } = useAccent();

    return (
        <div className="accent-picker">
            <div className="accent-picker__header">
                <Palette size={16} />
                <span>Акцентный цвет</span>
            </div>

            <div className="accent-picker__grid">
                {accents.map((a) => {
                    const isActive = a.id === accentId;
                    return (
                        <button
                            key={a.id}
                            type="button"
                            className={`accent-picker__item ${isActive ? 'active' : ''}`}
                            onClick={() => setAccent(a.id)}
                            title={a.name}
                            aria-label={a.name}
                            aria-pressed={isActive}
                        >
                            <span
                                className="accent-picker__swatch"
                                style={{ backgroundColor: a.preview }}
                            >
                                {isActive && <Check size={14} color="#fff" />}
                            </span>
                            <span className="accent-picker__name">{a.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}