// src/components/ProjectCover.js

import React, { useState, useEffect } from 'react';
import { getProjectColor, getProjectInitials } from '../utils/projectColor';
import { toAbsoluteUrl } from '../utils/urls';
import '../styles/components/ProjectCover.css';

export default function ProjectCover({
    coverImageUrl,
    name,
    publicCode,
    size = 'md',
    rounded = false,
}) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [coverImageUrl]);

    const showImage = !!coverImageUrl && !imageFailed;
    const backgroundColor = getProjectColor(publicCode || name || '');
    const initials = getProjectInitials(name);

    return (
        <div
            className={
                `project-cover project-cover--${size}` +
                (rounded ? ' project-cover--rounded' : '')
            }
            style={!showImage ? { backgroundColor } : undefined}
        >
            {showImage ? (
                <img
                    src={toAbsoluteUrl(coverImageUrl)}
                    alt={name || 'Обложка проекта'}
                    className="project-cover__img"
                    onError={() => {
                        console.warn('❌ Обложка не загрузилась:', toAbsoluteUrl(coverImageUrl));
                        setImageFailed(true);
                    }}
                    loading="lazy"
                />
            ) : (
                <span className="project-cover__initials">{initials}</span>
            )}
        </div>
    );
}