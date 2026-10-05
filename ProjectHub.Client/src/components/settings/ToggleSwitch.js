// projecthub.client/src/components/settings/ToggleSwitch.js

import React from 'react';
import '../../styles/components/ToggleSwitch.css';

/**
 * Универсальный тумблер.
 *
 * props:
 *   checked   — bool
 *   onChange  — (newValue) => void
 *   disabled  — bool
 *   size      — 'sm' | 'md' | 'lg' (по умолчанию 'md')
 *   title     — подпись для tooltip
 */
export default function ToggleSwitch({
    checked,
    onChange,
    disabled = false,
    size = 'md',
    title,
}) {
    const handleClick = () => {
        if (disabled) return;
        onChange(!checked);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={`toggle-switch toggle-switch--${size} ${checked ? 'on' : 'off'} ${disabled ? 'disabled' : ''}`}
            onClick={handleClick}
            disabled={disabled}
            title={title}
        >
            <span className="toggle-switch-thumb" />
        </button>
    );
}