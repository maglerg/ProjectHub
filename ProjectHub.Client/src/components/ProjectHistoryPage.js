// projecthub.client/src/components/ProjectHistoryPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Loader2, X } from 'lucide-react';
import { getProjectHistory } from '../services/projectsApi';
import {
    ACTIVITY_FILTERS,
    getActivityInfo
} from '../utils/activityConstants';
import { formatRelativeTime } from '../utils/datetime';
import '../styles/components/ProjectHistoryPage.css';

const PAGE_SIZE = 30;

// 📌 Группы активностей, которые НЕ показываем на этой странице
const EXCLUDED_GROUPS = ['chat'];

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

    // ── Фильтры без исключённых групп ──
    const visibleFilters = ACTIVITY_FILTERS.filter(
        f => !EXCLUDED_GROUPS.includes(f.value)
    );

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

    // ── Клиентская фильтрация: по группе + исключаем чат ──
    const visibleItems = items.filter(it => {
        const info = getActivityInfo(it.type);

        // 📌 Никогда не показываем события из исключённых групп
        if (EXCLUDED_GROUPS.includes(info.group)) return false;

        if (activeGroup === 'all') return true;
        return info.group === activeGroup;
    });

    const hasMore = items.length < total;

    const handleShowMore = () => {
        const newSkip = skip + PAGE_SIZE;
        setSkip(newSkip);
        loadPage(false);
    };

    if (loading) {
        return (
            <div className="history-loading">
                <Loader2 size={24} className="icon-spin" />
                Загрузка истории…
            </div>
        );
    }

    if (error) {
        return (
            <div className="history-error">
                <X size={16} />
                Ошибка: {error}
            </div>
        );
    }

    return (
        <div className={embedded ? 'project-history-page project-history-page--embedded' : 'project-history-page'}>
            {/* ── Шапка (только в standalone-режиме) ── */}
            {!embedded && (
                <header className="history-header">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        Назад
                    </button>
                    <h1>
                        <History size={24} />
                        История проекта
                    </h1>
                    <span className="history-total">{total} событий</span>
                </header>
            )}

            {/* ── В embedded показываем только счётчик ── */}
            {embedded && (
                <div className="history-embedded-meta">
                    <span className="history-total">{total} событий</span>
                </div>
            )}

            {/* ── Фильтры (без исключённых групп) ── */}
            <div className="history-filters">
                {visibleFilters.map(f => {
                    const FilterIcon = f.lucideIcon;
                    return (
                        <button
                            key={f.value}
                            type="button"
                            className={`btn btn--sm history-filter-btn ${activeGroup === f.value ? 'active' : ''}`}
                            onClick={() => setActiveGroup(f.value)}
                        >
                            {FilterIcon ? (
                                <FilterIcon size={14} />
                            ) : (
                                <span className="history-filter-icon">{f.icon}</span>
                            )}
                            {f.label}
                        </button>
                    );
                })}
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
                        const ItemIcon = info.lucideIcon;

                        return (
                            <div
                                key={item.id}
                                className={`history-item history-item-${info.group}`}
                                onClick={() => item.link && navigate(item.link)}
                                role={item.link ? 'button' : undefined}
                                tabIndex={item.link ? 0 : undefined}
                                onKeyDown={(e) => {
                                    if (!item.link) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(item.link);
                                    }
                                }}
                            >
                                <div className="history-icon">
                                    {ItemIcon ? (
                                        <ItemIcon size={18} />
                                    ) : (
                                        info.icon
                                    )}
                                </div>

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
                    type="button"
                    className="btn btn--secondary btn--block"
                    onClick={handleShowMore}
                    disabled={loadingMore}
                >
                    {loadingMore ? (
                        <>
                            <Loader2 size={16} className="icon-spin" />
                            Загрузка…
                        </>
                    ) : (
                        'Показать ещё'
                    )}
                </button>
            )}
        </div>
    );
}