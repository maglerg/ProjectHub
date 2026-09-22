// projecthub.client/src/components/ChatCover.js

import React from 'react';
import ProjectCover from './ProjectCover';

/**
 * Обложка чата.
 *   • Project-чат → использует обложку проекта (та же картинка / инициалы),
 *     потому что у чата проекта нет своей обложки.
 *   • Personal-чат → null (для личных чатов используется UserAvatar собеседника).
 *
 * @param {object} chat   — объект ChatDto или ChatListDto
 * @param {string} size   — 'sm' | 'md' | 'lg'
 */
export default function ChatCover({ chat, size = 'md' }) {
    if (!chat || chat.type !== 'Project') return null;

    return (
        <ProjectCover
            coverImageUrl={chat.coverImageUrl}
            name={chat.name || 'Чат проекта'}
            publicCode={chat.projectPublicCode}
            size={size}
        />
    );
}