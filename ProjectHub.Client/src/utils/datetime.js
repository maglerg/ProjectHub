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