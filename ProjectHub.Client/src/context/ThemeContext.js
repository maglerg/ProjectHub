// src/context/ThemeContext.js

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
} from 'react';

const STORAGE_KEY = 'projecthub.theme';

const ThemeContext = createContext(null);

/**
 * Значения theme:
 *   'light'  — светлая
 *   'dark'   — тёмная
 *   'system' — как в системе (по умолчанию)
 *
 * effectiveTheme (что реально применяется) — всегда 'light' | 'dark'.
 */
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || 'system';
        } catch {
            return 'system';
        }
    });

    // Системная тема
    const [systemDark, setSystemDark] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Следим за системной темой
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setSystemDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Что применяется фактически
    const effectiveTheme = useMemo(() => {
        if (theme === 'system') return systemDark ? 'dark' : 'light';
        return theme;
    }, [theme, systemDark]);

    // Применяем к <html>
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', effectiveTheme);

        // Обновляем meta theme-color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute(
                'content',
                effectiveTheme === 'dark' ? '#0f172a' : '#ffffff'
            );
        }
    }, [effectiveTheme]);

    // Сеттер с сохранением в localStorage
    const setTheme = useCallback((next) => {
        if (!['light', 'dark', 'system'].includes(next)) return;
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
    }, []);

    const value = useMemo(
        () => ({ theme, effectiveTheme, setTheme }),
        [theme, effectiveTheme, setTheme]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return ctx;
}