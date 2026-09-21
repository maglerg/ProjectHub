// src/components/UserAvatar.js

import React, { useState, useEffect } from 'react';
import { getUserColor, getUserInitials } from '../utils/userColor';
import { toAbsoluteUrl } from '../utils/urls';
import '../styles/components/UserAvatar.css';

/**
 * Аватар пользователя.
 *   • есть avatarUrl → показываем картинку;
 *   • картинка не загрузилась → fallback на инициалы;
 *   • нет картинки → инициалы на детерминированном цветном фоне.
 */
export default function UserAvatar({
    avatarUrl,
    name,
    email,
    size = 'md',      // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className = '',
    title,
}) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [avatarUrl]);

    const showImage = !!avatarUrl && !imageFailed;
    const backgroundColor = getUserColor(email || name || '');
    const initials = getUserInitials(name, email);

    return (
        <div
            className={`user-avatar user-avatar--${size} ${className}`}
            style={!showImage ? { backgroundColor } : undefined}
            title={title || name || email || ''}
        >
            {showImage ? (
                <img
                    src={toAbsoluteUrl(avatarUrl)}
                    alt={name || 'Аватар'}
                    className="user-avatar__img"
                    onError={() => setImageFailed(true)}
                    loading="lazy"
                />
            ) : (
                <span className="user-avatar__initials">{initials}</span>
            )}
        </div>
    );
}