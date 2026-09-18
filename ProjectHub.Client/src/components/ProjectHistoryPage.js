// projecthub.client/src/components/ProjectHistoryPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectHistory } from '../services/projectsApi';
import {
    ACTIVITY_FILTERS,
    getActivityInfo
} from '../utils/activityConstants';
import { formatRelativeTime } from '../utils/datetime';
import '../styles/components/ProjectHistoryPage.css';

const PAGE_SIZE = 30;

export default function ProjectHistoryPage({ embedded = false }) {
    const { code } = useParams();
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);

    const [activeGroup, setActiveGroup] = useState('all');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    // ── Загрузка ──
    const loadPage = async (reset = false) => {
        const currentSkip = reset ? 0 : skip;

        if (reset) setLoading(true);
        else setLoadingMore(true);

        setError(null);
        try {
            const page = await getProjectHistory(code, {
                skip: currentSkip,
                take: PAGE_SIZE
            });

            const newItems = page.items || [];

            if (reset) {
                setItems(newItems);
                setSkip(0);
            } else {
                setItems(prev => [...prev, ...newItems]);
            }

            setTotal(page.total || 0);
        } catch (e) {
            console.error('❌ Ошибка загрузки истории:', e);
            setError(e.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadPage(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // ── Фильтрация на клиенте по группе ──
    const visibleItems = activeGroup === 'all'
        ? items
        : items.filter(it => getActivityInfo(it.type).group === activeGroup);

    const hasMore = items.length < total;

    const handleShowMore = () => {
        const newSkip = skip + PAGE_SIZE;
        setSkip(newSkip);
        loadPage(false);
    };

    if (loading) {
        return <div className="history-loading">Загрузка истории…</div>;
    }

    if (error) {
        return <div className="history-error">Ошибка: {error}</div>;
    }

    return (
        <div className={embedded ? 'project-history-page project-history-page--embedded' : 'project-history-page'}>
            {/* ── Шапка (только в standalone-режиме) ── */}
            {!embedded && (
                <header className="history-header">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        ← Назад
                    </button>
                    <h1>📜 История проекта</h1>
                    <span className="history-total">{total} событий</span>
                </header>
            )}

            {/* ── В embedded показываем только счётчик ── */}
            {embedded && (
                <div className="history-embedded-meta">
                    <span className="history-total">{total} событий</span>
                </div>
            )}

            {/* ── Фильтры ── */}
            <div className="history-filters">
                {ACTIVITY_FILTERS.map(f => (
                    <button
                        key={f.value}
                        type="button"
                        className={`history-filter-btn ${activeGroup === f.value ? 'active' : ''}`}
                        onClick={() => setActiveGroup(f.value)}
                    >
                        <span className="history-filter-icon">{f.icon}</span>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Лента ── */}
            {visibleItems.length === 0 ? (
                <div className="history-empty">
                    {items.length === 0
                        ? 'Событий пока нет'
                        : 'По этому фильтру событий нет'}
                </div>
            ) : (
                <div className="history-list">
                    {visibleItems.map(item => {
                        const info = getActivityInfo(item.type);
                        return (
                            <div
                                key={item.id}
                                className={`history-item history-item-${info.group}`}
                                onClick={() => item.link && navigate(item.link)}
                                role={item.link ? 'button' : undefined}
                                tabIndex={item.link ? 0 : undefined}
                            >
                                <div className="history-icon">{info.icon}</div>

                                <div className="history-content">
                                    <div className="history-row">
                                        <span className="history-user">
                                            {item.userName}
                                        </span>
                                        <span className="history-label">
                                            {info.label}
                                        </span>
                                        <span className="history-date">
                                            {formatRelativeTime(item.createdAt)}
                                        </span>
                                    </div>
                                    {item.summary && (
                                        <div className="history-summary">
                                            {item.summary}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Пагинация ── */}
            {hasMore && (
                <button
                    className="btn-load-more"
                    onClick={handleShowMore}
                    disabled={loadingMore}
                >
                    {loadingMore ? 'Загрузка…' : 'Показать ещё'}
                </button>
            )}
        </div>
    );
}