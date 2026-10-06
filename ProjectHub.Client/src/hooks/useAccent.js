// src/hooks/useAccent.js

import { useState, useEffect, useCallback } from 'react';
import {
    ACCENT_THEMES,
    DEFAULT_ACCENT_ID,
    getAccentById,
    applyAccent,
} from '../utils/accentThemes';

const STORAGE_KEY = 'projecthub.accent';
const THEME_KEY = 'projecthub.theme'; // если у вас уже есть ключ темы — подставьте свой

/**
 * Хук управления акцентным цветом.
 * Возвращает текущий accentId, список доступных пресетов и сеттер.
 */
export function useAccent() {
    const [accentId, setAccentIdState] = useState(
        () => localStorage.getItem(STORAGE_KEY) || DEFAULT_ACCENT_ID
    );

    // Текущая тема — берём из data-theme на <html>, следим за изменениями
    const [isDark, setIsDark] = useState(
        () => document.documentElement.getAttribute('data-theme') === 'dark'
    );

    // Следим за сменой темы, чтобы переприменить палитру
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const dark =
                document.documentElement.getAttribute('data-theme') === 'dark';
            setIsDark(dark);
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    // Применяем при изменении accentId или темы
    useEffect(() => {
        applyAccent(accentId, isDark);
    }, [accentId, isDark]);

    const setAccent = useCallback((id) => {
        const safe = getAccentById(id).id; // если передали мусор — вернёт дефолт
        localStorage.setItem(STORAGE_KEY, safe);
        setAccentIdState(safe);
    }, []);

    return {
        accentId,
        accent: getAccentById(accentId),
        accents: ACCENT_THEMES,
        setAccent,
    };
}