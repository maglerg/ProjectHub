/** Date → строка для <input type="datetime-local"> */
export const toLocalInputValue = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
};

/** Дата в читаемый вид для UI */
export const formatDateTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

/** Класс для бейджа дедлайна: '' | 'soon' | 'overdue' */
export const getDeadlineStatus = (dueDate, isCompleted) => {
    if (!dueDate || isCompleted) return '';
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    if (diff < 0) return 'overdue';
    if (diff < 24 * 60 * 60 * 1000) return 'soon';
    return '';
};
export const validateDateRange = (startDate, dueDate, projectDeadline) => {
    const start = startDate ? new Date(startDate) : null;
    const due = dueDate ? new Date(dueDate) : null;
    const proj = projectDeadline ? new Date(projectDeadline) : null;

    if (start && proj && start > proj) {
        return 'Дата начала не может быть позже дедлайна проекта.';
    }
    if (due && proj && due > proj) {
        return 'Дедлайн задачи не может быть позже дедлайна проекта.';
    }
    if (start && due && due < start) {
        return 'Дедлайн задачи не может быть раньше даты начала.';
    }
    return null;
};
/** Разница в днях между двумя датами */
export const daysBetween = (a, b) => {
    const ms = new Date(b) - new Date(a);
    return ms / (1000 * 60 * 60 * 24);
};

/** Сдвинуть дату на N дней */
export const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
};

/** Начало дня (без времени) */
export const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Формат "16 сен" */
export const formatShortDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit', month: 'short'
    });
};
/** Начало месяца (1-е число, 00:00) */
export const startOfMonth = (date) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Конец месяца (последний день, 23:59) */
export const endOfMonth = (date) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
};

/** Количество дней в месяце */
export const daysInMonth = (date) => {
    return endOfMonth(date).getDate();
};

/** Название месяца коротко: "сен" */
export const formatMonthShort = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', { month: 'short' });
};
/** «5 минут назад», «вчера в 15:30» */
export const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'только что';
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHour < 24) return `${diffHour} ч назад`;
    if (diffDay === 1) return 'вчера';
    if (diffDay < 7) return `${diffDay} дн назад`;

    return d.toLocaleDateString('ru-RU', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};