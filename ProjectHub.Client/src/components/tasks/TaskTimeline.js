import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPriorityInfo, getPriorityColor } from '../../utils/constants';
import {
    daysBetween,
    startOfDay,
    addDays,
    startOfMonth,
    endOfMonth,
    formatShortDate,
    formatMonthShort,
    formatDateTime
} from '../../utils/datetime';

const DAY_WIDTH = 30;
const PADDING_DAYS = 3;
const LABEL_WIDTH = 200; // ширина левой колонки с названиями

export default function TaskTimeline({ columns }) {
    const navigate = useNavigate();
    const { code } = useParams();

    const tasks = columns.flatMap(c => c.tasks || []);

    // ── Считаем диапазон дат с учётом эффективного дедлайна ──
    const allDates = [];
    tasks.forEach(t => {
        if (t.startDate) allDates.push(new Date(t.startDate));
        if (t.effectiveDueDate) allDates.push(new Date(t.effectiveDueDate));
        else if (t.dueDate) allDates.push(new Date(t.dueDate));
        if (t.createdAt) allDates.push(new Date(t.createdAt));
    });

    if (allDates.length === 0) {
        return (
            <div className="timeline-empty">
                Нет данных для отображения таймлайна.
            </div>
        );
    }

    const minDate = startOfDay(new Date(Math.min(...allDates)));
    const maxDate = startOfDay(new Date(Math.max(...allDates)));

    const rangeStart = startOfMonth(addDays(minDate, -PADDING_DAYS));
    const rangeEnd = endOfMonth(addDays(maxDate, PADDING_DAYS));

    const days = [];
    let cursor = new Date(rangeStart);
    let offset = 0;
    while (cursor <= rangeEnd) {
        days.push({
            date: new Date(cursor),
            offset,
            isFirstOfMonth: cursor.getDate() === 1
        });
        cursor = addDays(cursor, 1);
        offset += DAY_WIDTH;
    }
    const totalWidth = days.length * DAY_WIDTH;

    const today = startOfDay(new Date());
    const todayIndex = days.findIndex(
        d => d.date.getTime() === today.getTime()
    );
    const todayOffset = todayIndex >= 0 ? todayIndex * DAY_WIDTH : -100;

    // ── Полоса задачи ──
    const getBar = (t) => {
        const start = startOfDay(
            t.startDate ? new Date(t.startDate) : new Date(t.createdAt)
        );

        // Используем эффективный дедлайн (учитывает дедлайн проекта)
        const effectiveDue = t.effectiveDueDate || t.dueDate;
        let end = effectiveDue
            ? startOfDay(new Date(effectiveDue))
            : addDays(start, 3);

        const startIdx = days.findIndex(
            d => d.date.getTime() === start.getTime()
        );
        const endIdx = days.findIndex(
            d => d.date.getTime() === end.getTime()
        );

        const startOffset =
            startIdx >= 0
                ? startIdx * DAY_WIDTH
                : Math.max(0, daysBetween(rangeStart, start) * DAY_WIDTH);

        const endOffset =
            endIdx >= 0
                ? endIdx * DAY_WIDTH
                : Math.min(days.length, daysBetween(rangeStart, end) * DAY_WIDTH);

        return {
            left: startOffset,
            width: Math.max(DAY_WIDTH, endOffset - startOffset)
        };
    };

    return (
        <div className="task-timeline">
            {/* ── Левая фиксированная колонка с названиями ── */}
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
                                : 'Никто не взял'
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

            {/* ── Правая скроллируемая область ── */}
            <div className="timeline-right">
                <div className="timeline-right-inner" style={{ width: totalWidth }}>
                    {/* Шапка со шкалой */}
                    <div className="timeline-header-scale">
                        {days.map((d, idx) => (
                            <div
                                key={idx}
                                className={`timeline-day-label ${d.isFirstOfMonth ? 'month-start' : ''
                                    }`}
                                style={{ left: d.offset, width: DAY_WIDTH }}
                                title={formatShortDate(d.date)}
                            >
                                {d.isFirstOfMonth
                                    ? `1 ${formatMonthShort(d.date)}`
                                    : d.date.getDate()}
                            </div>
                        ))}
                        {todayIndex >= 0 && (
                            <div
                                className="timeline-today"
                                style={{ left: todayOffset }}
                                title={`Сегодня: ${formatShortDate(today)}`}
                            />
                        )}
                    </div>

                    {/* Строки задач */}
                    <div className="timeline-body">
                        {tasks.map(t => {
                            const bar = getBar(t);
                            const color = getPriorityColor(t.priority);

                            // Просрочка — считаем по эффективному дедлайну
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
                                        {days.map((d, idx) => (
                                            <div
                                                key={idx}
                                                className={`timeline-day-cell ${d.isFirstOfMonth
                                                    ? 'month-start'
                                                    : ''
                                                    }`}
                                                style={{ width: DAY_WIDTH }}
                                            />
                                        ))}
                                    </div>

                                    <div
                                        className={`timeline-bar ${overdue ? 'overdue' : ''
                                            } ${t.completedAt ? 'completed' : ''}`}
                                        style={{
                                            left: bar.left,
                                            width: bar.width,
                                            backgroundColor:
                                                color === 'transparent'
                                                    ? '#9ca3af'
                                                    : color
                                        }}
                                    />

                                    {todayIndex >= 0 && (
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
    );
}