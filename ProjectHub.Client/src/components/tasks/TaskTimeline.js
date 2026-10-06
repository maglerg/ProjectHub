// projecthub.client/src/components/tasks/TaskTimeline.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    CalendarCheck,        // 🆕 кнопка «К сегодня»
} from 'lucide-react';
import { getPriorityInfo, getPriorityColor } from '../../utils/constants';
import {
    daysBetween,
    startOfDay,
    addDays,
    startOfMonth,
    endOfMonth,
    formatShortDate,
    formatMonthShort,
    formatDateTime,
} from '../../utils/datetime';

// ═══════════════════════════════════════════════════════════
//  УРОВНИ МАСШТАБА
//  Каждый уровень = своя единица сетки + ширина единицы.
// ═══════════════════════════════════════════════════════════

const SCALE_STORAGE_KEY = 'timeline.scale';

const SCALES = [
    {
        id: 'month',
        label: 'Месяц',
        hint: 'Обзор всего проекта',
        unitMs: 24 * 60 * 60 * 1000,
        unitWidth: 8,
        headerFormatter: (date) =>
            date.getDate() === 1
                ? formatMonthShort(date)
                : date.getDate(),
        headerWidth: 40,
        minorLine: false,
    },
    {
        id: 'week',
        label: 'Неделя',
        hint: 'Обзор задач',
        unitMs: 24 * 60 * 60 * 1000,
        unitWidth: 20,
        headerFormatter: (date) =>
            date.getDate() === 1
                ? `1 ${formatMonthShort(date)}`
                : date.getDate(),
        headerWidth: 24,
        minorLine: true,
    },
    {
        id: 'day',
        label: 'День',
        hint: 'По умолчанию',
        unitMs: 24 * 60 * 60 * 1000,
        unitWidth: 40,
        headerFormatter: (date) =>
            date.getDate() === 1
                ? `1 ${formatMonthShort(date)}`
                : date.getDate(),
        headerWidth: 40,
        minorLine: true,
    },
    {
        id: 'shift',
        label: 'Смена',
        hint: '12 часов',
        unitMs: 12 * 60 * 60 * 1000,
        unitWidth: 60,
        headerFormatter: (date) => {
            const h = date.getHours();
            const period = h < 12 ? 'AM' : 'PM';
            const showDate = h === 0 || h === 12;
            return showDate
                ? `${date.getDate()} ${formatMonthShort(date)} · ${period}`
                : period;
        },
        headerWidth: 90,
        minorLine: true,
    },
    {
        id: 'hour',
        label: 'Час',
        hint: 'Микроменеджмент',
        unitMs: 60 * 60 * 1000,
        unitWidth: 50,
        headerFormatter: (date) => {
            const h = date.getHours();
            if (h === 0) {
                return `${date.getDate()} ${formatMonthShort(date)}`;
            }
            return `${String(h).padStart(2, '0')}:00`;
        },
        headerWidth: 50,
        minorLine: true,
    },
    {
        id: 'quarter',
        label: '15 мин',
        hint: 'Максимальный зум',
        unitMs: 15 * 60 * 1000,
        unitWidth: 40,
        headerFormatter: (date) => {
            const h = date.getHours();
            const m = date.getMinutes();
            if (h === 0 && m === 0) {
                return `${date.getDate()} ${formatMonthShort(date)}`;
            }
            if (m === 0) {
                return `${String(h).padStart(2, '0')}:00`;
            }
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        },
        headerWidth: 50,
        minorLine: true,
    },
];

const DEFAULT_SCALE_ID = 'day';
const LABEL_WIDTH = 200;
const PADDING_UNITS = 3;

// 🆕 Доля ширины контейнера, на которой оказывается «сегодня»
//    после авто-скролла. 0.35 = 35% слева → видно чуть больше будущего.
const TODAY_SCROLL_RATIO = 0.35;

function getScaleConfig(scaleId) {
    return SCALES.find(s => s.id === scaleId) || SCALES.find(s => s.id === DEFAULT_SCALE_ID);
}

// ═══════════════════════════════════════════════════════════
//  КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════

export default function TaskTimeline({ columns }) {
    const navigate = useNavigate();
    const { code } = useParams();

    // ── Масштаб (сохраняем выбор пользователя) ──
    const [scaleId, setScaleId] = useState(
        () => localStorage.getItem(SCALE_STORAGE_KEY) || DEFAULT_SCALE_ID
    );
    useEffect(() => {
        localStorage.setItem(SCALE_STORAGE_KEY, scaleId);
    }, [scaleId]);

    const scale = getScaleConfig(scaleId);

    // ── Ссылка на скроллируемый контейнер ──
    const scrollRef = useRef(null);

    // 🆕 Флаг «первый рендер» — при первом скролле делаем smooth,
    //    при смене зума — мгновенно, чтобы не раздражать.
    const isFirstScrollRef = useRef(true);

    const tasks = useMemo(
        () => columns.flatMap(c => c.tasks || []),
        [columns]
    );

    // ── Считаем диапазон дат ──
    const range = useMemo(() => {
        if (tasks.length === 0) return null;

        const allDates = [];
        tasks.forEach(t => {
            if (t.startDate) allDates.push(new Date(t.startDate));
            if (t.effectiveDueDate) allDates.push(new Date(t.effectiveDueDate));
            else if (t.dueDate) allDates.push(new Date(t.dueDate));
            if (t.createdAt) allDates.push(new Date(t.createdAt));
            if (t.completedAt) allDates.push(new Date(t.completedAt));
        });

        if (allDates.length === 0) return null;

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));

        const paddingMs = scale.unitMs * PADDING_UNITS;

        return {
            start: new Date(minDate.getTime() - paddingMs),
            end: new Date(maxDate.getTime() + paddingMs),
        };
    }, [tasks, scale.unitMs]);

    // ── Строим шкалу ──
    const units = useMemo(() => {
        if (!range) return [];

        const result = [];
        const startMs = Math.floor(range.start.getTime() / scale.unitMs) * scale.unitMs;
        let cursor = startMs;
        const endMs = range.end.getTime();
        let offset = 0;

        while (cursor <= endMs) {
            const date = new Date(cursor);
            result.push({
                date,
                offset,
                isDayStart: date.getHours() === 0 && date.getMinutes() === 0,
            });
            cursor += scale.unitMs;
            offset += scale.unitWidth;
        }
        return result;
    }, [range, scale.unitMs, scale.unitWidth]);

    const totalWidth = units.length * scale.unitWidth;

    // ── Сегодня ──
    const todayOffset = useMemo(() => {
        if (!range) return -1000;
        const today = startOfDay(new Date());
        const msPerUnit = scale.unitMs;
        const rangeStartMs = Math.floor(range.start.getTime() / msPerUnit) * msPerUnit;
        const diffMs = today.getTime() - rangeStartMs;

        if (diffMs < 0) return -1000;
        if (diffMs > units.length * msPerUnit) return -1000;

        return (diffMs / msPerUnit) * scale.unitWidth;
    }, [range, scale.unitMs, scale.unitWidth, units.length]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 АВТО-СКРОЛЛ К «СЕГОДНЯ»
    //  Срабатывает:
    //    • при первом рендере (после того как шкала построена),
    //    • при смене масштаба,
    //    • при пересчёте todayOffset (например, изменились данные).
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const containerWidth = el.clientWidth;
        if (containerWidth === 0) return; // ещё не смонтирован / скрыт

        // Куда скроллить
        let target;

        if (todayOffset < 0) {
            // «Сегодня» — до начала проекта: показываем начало
            target = 0;
        } else if (todayOffset > totalWidth) {
            // «Сегодня» — после конца проекта: показываем конец
            target = totalWidth - containerWidth;
        } else {
            // Центрируем «сегодня» на 35% ширины контейнера
            target = todayOffset - containerWidth * TODAY_SCROLL_RATIO;
        }

        // Ограничиваем валидным диапазоном
        const maxScroll = Math.max(0, totalWidth - containerWidth);
        target = Math.max(0, Math.min(target, maxScroll));

        el.scrollTo({
            left: target,
            behavior: isFirstScrollRef.current ? 'smooth' : 'auto',
        });

        isFirstScrollRef.current = false;
    }, [scaleId, todayOffset, totalWidth]);

    // ═══════════════════════════════════════════════════════════
    //  🆕 КНОПКА «К СЕГОДНЯ»
    // ═══════════════════════════════════════════════════════════
    const scrollToToday = () => {
        const el = scrollRef.current;
        if (!el) return;

        const containerWidth = el.clientWidth;
        const maxScroll = Math.max(0, totalWidth - containerWidth);

        let target;
        if (todayOffset < 0) {
            target = 0;
        } else if (todayOffset > totalWidth) {
            target = maxScroll;
        } else {
            target = todayOffset - containerWidth * TODAY_SCROLL_RATIO;
        }

        el.scrollTo({
            left: Math.max(0, Math.min(target, maxScroll)),
            behavior: 'smooth',
        });
    };

    // ── Полоса задачи ──
    const getBar = (t) => {
        if (!range) return { left: 0, width: scale.unitWidth };

        const start = t.startDate
            ? new Date(t.startDate)
            : new Date(t.createdAt);

        const effectiveDue = t.effectiveDueDate || t.dueDate;
        const end = effectiveDue
            ? new Date(effectiveDue)
            : new Date(start.getTime() + scale.unitMs);

        const rangeStartMs =
            Math.floor(range.start.getTime() / scale.unitMs) * scale.unitMs;

        const startPx = ((start.getTime() - rangeStartMs) / scale.unitMs) * scale.unitWidth;
        const endPx = ((end.getTime() - rangeStartMs) / scale.unitMs) * scale.unitWidth;

        const left = Math.max(0, startPx);
        const right = Math.min(totalWidth, endPx);
        const width = Math.max(scale.unitWidth, right - left);

        return { left, width };
    };

    // ── Управление зумом ──
    const zoomIn = () => {
        const idx = SCALES.findIndex(s => s.id === scaleId);
        if (idx < SCALES.length - 1) setScaleId(SCALES[idx + 1].id);
    };

    const zoomOut = () => {
        const idx = SCALES.findIndex(s => s.id === scaleId);
        if (idx > 0) setScaleId(SCALES[idx - 1].id);
    };

    const resetZoom = () => setScaleId(DEFAULT_SCALE_ID);

    // ── Горячие клавиши +/− ──
    useEffect(() => {
        const handler = (e) => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scaleId]);

    // ── Ctrl + колесо = зум с сохранением позиции под курсором ──
    const handleWheel = (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();

        const el = scrollRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left + el.scrollLeft;
        const cursorRatio = cursorX / totalWidth;

        if (e.deltaY < 0) zoomIn();
        else zoomOut();

        requestAnimationFrame(() => {
            const newTotal = el.scrollWidth;
            el.scrollLeft = cursorRatio * newTotal - (e.clientX - rect.left);
        });
    };

    // ── Рендер ──
    if (!range || tasks.length === 0) {
        return (
            <div className="timeline-empty">
                Нет данных для отображения таймлайна.
            </div>
        );
    }

    return (
        <div className="task-timeline-wrapper">
            {/* ═══ Панель управления зумом ═══ */}
            <div className="timeline-toolbar">
                <div className="timeline-toolbar-hint">
                    <span className="timeline-scale-label">
                        Масштаб: <b>{scale.label}</b>
                    </span>
                    {scale.hint && (
                        <span className="timeline-scale-hint">{scale.hint}</span>
                    )}
                </div>

                <div className="timeline-toolbar-actions">
                    {/* 🆕 Кнопка «К сегодня» */}
                    {todayOffset >= 0 && (
                        <button
                            type="button"
                            className="btn btn--secondary btn--sm timeline-today-btn"
                            onClick={scrollToToday}
                            title="Прокрутить к сегодняшнему дню"
                            aria-label="Прокрутить к сегодняшнему дню"
                        >
                            <CalendarCheck size={14} />
                            Сегодня
                        </button>
                    )}

                    <div className="timeline-zoom-controls">
                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={zoomOut}
                            disabled={scaleId === SCALES[0].id}
                            title="Отдалить (−)"
                            aria-label="Отдалить"
                        >
                            <ZoomOut size={16} />
                        </button>

                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={resetZoom}
                            title="Сбросить масштаб (0)"
                            aria-label="Сбросить масштаб"
                            disabled={scaleId === DEFAULT_SCALE_ID}
                        >
                            <RotateCcw size={14} />
                        </button>

                        <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            onClick={zoomIn}
                            disabled={scaleId === SCALES[SCALES.length - 1].id}
                            title="Приблизить (+)"
                            aria-label="Приблизить"
                        >
                            <ZoomIn size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ Сам таймлайн ═══ */}
            <div className="task-timeline">
                {/* Левая фиксированная колонка с названиями */}
                <div className="timeline-left" style={{ width: LABEL_WIDTH }}>
                    <div className="timeline-header-left">Задача</div>
                    <div className="timeline-left-body">
                        {tasks.map(t => {
                            const priorityInfo = getPriorityInfo(t.priority);
                            const PriorityIcon = priorityInfo.lucideIcon;
                            const assignees = t.assignees || [];
                            const effectiveDue = t.effectiveDueDate || t.dueDate;

                            const tooltip = [
                                t.title,
                                `Приоритет: ${priorityInfo.label}`,
                                t.startDate
                                    ? `Начало: ${formatDateTime(t.startDate)}`
                                    : 'Начало: —',
                                effectiveDue
                                    ? `${t.isDueDateFixed ? 'Дедлайн' : 'Дедлайн (по проекту)'}: ${formatDateTime(effectiveDue)}`
                                    : 'Без дедлайна',
                                assignees.length
                                    ? `Исполнители: ${assignees.map(a => a.name || a.email).join(', ')}`
                                    : 'Никто не взял',
                            ].join('\n');

                            return (
                                <div
                                    key={t.id}
                                    className="timeline-row-label"
                                    title={tooltip}
                                    onClick={() =>
                                        navigate(`/projects/${code}/tasks/${t.id}`)
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(`/projects/${code}/tasks/${t.id}`);
                                        }
                                    }}
                                >
                                    {t.priority && t.priority !== 'None' && PriorityIcon && (
                                        <span
                                            className="timeline-priority-icon"
                                            style={{ color: priorityInfo.color }}
                                        >
                                            <PriorityIcon size={12} />
                                        </span>
                                    )}
                                    <span className="timeline-row-title">
                                        {t.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Правая скроллируемая область */}
                <div
                    className="timeline-right"
                    ref={scrollRef}
                    onWheel={handleWheel}
                >
                    <div
                        className="timeline-right-inner"
                        style={{ width: totalWidth }}
                    >
                        {/* Шапка со шкалой */}
                        <div className="timeline-header-scale">
                            {units.map((u, idx) => {
                                const label = scale.headerFormatter(u.date);

                                const minGap = 32;
                                const every = Math.max(
                                    1,
                                    Math.ceil(minGap / scale.unitWidth)
                                );
                                const showLabel =
                                    idx % every === 0 ||
                                    u.isDayStart ||
                                    u.date.getDate() === 1;

                                return (
                                    <div
                                        key={idx}
                                        className={[
                                            'timeline-unit-label',
                                            u.isDayStart ? 'day-start' : '',
                                            u.date.getDate() === 1 ? 'month-start' : '',
                                        ].filter(Boolean).join(' ')}
                                        style={{
                                            left: u.offset,
                                            width: scale.unitWidth,
                                        }}
                                        title={formatDateTime(u.date)}
                                    >
                                        {showLabel ? label : ''}
                                    </div>
                                );
                            })}

                            {units.map((u, idx) =>
                                u.isDayStart && scale.minorLine ? (
                                    <div
                                        key={`day-${idx}`}
                                        className="timeline-day-divider"
                                        style={{ left: u.offset }}
                                    />
                                ) : null
                            )}

                            {todayOffset >= 0 && (
                                <div
                                    className="timeline-today"
                                    style={{ left: todayOffset }}
                                    title={`Сегодня: ${formatShortDate(new Date())}`}
                                />
                            )}
                        </div>

                        {/* Строки задач */}
                        <div className="timeline-body">
                            {tasks.map(t => {
                                const bar = getBar(t);
                                const color = getPriorityColor(t.priority);

                                const effectiveDue = t.effectiveDueDate || t.dueDate;
                                const overdue =
                                    effectiveDue &&
                                    !t.completedAt &&
                                    new Date(effectiveDue) < new Date();

                                return (
                                    <div
                                        key={t.id}
                                        className="timeline-row-track"
                                        onClick={() =>
                                            navigate(`/projects/${code}/tasks/${t.id}`)
                                        }
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                navigate(`/projects/${code}/tasks/${t.id}`);
                                            }
                                        }}
                                    >
                                        <div className="timeline-day-grid">
                                            {units.map((u, idx) => {
                                                const isDayStart = u.isDayStart;
                                                const isMonthStart = u.date.getDate() === 1;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={[
                                                            'timeline-day-cell',
                                                            isDayStart && scale.minorLine
                                                                ? 'day-start'
                                                                : '',
                                                            isMonthStart ? 'month-start' : '',
                                                        ].filter(Boolean).join(' ')}
                                                        style={{ width: scale.unitWidth }}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div
                                            className={`timeline-bar ${overdue ? 'overdue' : ''} ${t.completedAt ? 'completed' : ''}`}
                                            style={{
                                                left: bar.left,
                                                width: bar.width,
                                                backgroundColor:
                                                    color === 'transparent'
                                                        ? '#9ca3af'
                                                        : color,
                                            }}
                                            title={
                                                t.startDate
                                                    ? `${formatDateTime(t.startDate)} → ${effectiveDue ? formatDateTime(effectiveDue) : '—'}`
                                                    : `создана ${formatDateTime(t.createdAt)}`
                                            }
                                        />

                                        {todayOffset >= 0 && (
                                            <div
                                                className="timeline-today"
                                                style={{ left: todayOffset }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}