// projecthub.client/src/utils/constants.js

import {
    // Категории проектов
    BookOpen,
    FileText,
    GraduationCap,
    Globe,
    Smartphone,
    Monitor,
    Gamepad2,
    Rocket,
    BarChart3,
    Lock,
    Palette,
    Settings,
    Cpu,
    FlaskConical,
    Circle,
    // Приоритеты
    Flag,
    ArrowDown,
    Minus,
    AlertTriangle,
    AlertCircle,
    // Статусы
    CheckCircle2,
    Clock,
    // Видимость
    EyeOff,
} from 'lucide-react';

// ─── Категории проектов ──────────────────────────────
export const PROJECT_CATEGORIES = [
    { value: 'Education', label: 'Учебный проект', icon: '📚', lucideIcon: BookOpen },
    { value: 'Coursework', label: 'Курсовая работа', icon: '📝', lucideIcon: FileText },
    { value: 'Diploma', label: 'Дипломный проект', icon: '🎓', lucideIcon: GraduationCap },
    { value: 'WebDevelopment', label: 'Веб-разработка', icon: '🌐', lucideIcon: Globe },
    { value: 'MobileDevelopment', label: 'Мобильная разработка', icon: '📱', lucideIcon: Smartphone },
    { value: 'DesktopDevelopment', label: 'Десктопное ПО', icon: '💻', lucideIcon: Monitor },
    { value: 'GameDevelopment', label: 'Разработка игр', icon: '🎮', lucideIcon: Gamepad2 },
    { value: 'DevOps', label: 'DevOps', icon: '🚀', lucideIcon: Rocket },
    { value: 'DataScience', label: 'Data Science / AI', icon: '📊', lucideIcon: BarChart3 },
    { value: 'Cybersecurity', label: 'Кибербезопасность', icon: '🔐', lucideIcon: Lock },
    { value: 'Design', label: 'Дизайн', icon: '🎨', lucideIcon: Palette },
    { value: 'Backend', label: 'Бэкенд', icon: '⚙️', lucideIcon: Settings },
    { value: 'Frontend', label: 'Фронтенд', icon: '🖥️', lucideIcon: Cpu },
    { value: 'QA', label: 'Тестирование', icon: '🧪', lucideIcon: FlaskConical },
    { value: 'Other', label: 'Другое', icon: '🔹', lucideIcon: Circle },
];

// ─── Специализации пользователей ─────────────────────
export const SPECIALIZATIONS = [
    { value: 'Frontend', label: 'Фронтенд-разработчик', icon: '🖥️', lucideIcon: Monitor },
    { value: 'Backend', label: 'Бэкенд-разработчик', icon: '⚙️', lucideIcon: Settings },
    { value: 'Designer', label: 'Дизайнер', icon: '🎨', lucideIcon: Palette },
    { value: 'DevOps', label: 'DevOps-инженер', icon: '🚀', lucideIcon: Rocket },
    { value: 'QA', label: 'Тестировщик', icon: '🧪', lucideIcon: FlaskConical },
    { value: 'ProjectManager', label: 'Project-менеджер', icon: '📋', lucideIcon: FileText },
    { value: 'Analyst', label: 'Аналитик', icon: '📊', lucideIcon: BarChart3 },
    { value: 'FullStack', label: 'Full-stack разработчик', icon: '🔷', lucideIcon: Cpu },
    { value: 'Mobile', label: 'Мобильный разработчик', icon: '📱', lucideIcon: Smartphone },
    { value: 'Other', label: 'Другое', icon: '🔹', lucideIcon: Circle },
];

// ─── Приоритеты задач ────────────────────────────────
export const TASK_PRIORITIES = [
    { value: 'None', label: 'Без приоритета', short: 'Нет', color: '#9ca3af', icon: '⚪', lucideIcon: Minus },
    { value: 'Low', label: 'Низкий', short: 'Низкий', color: '#3b82f6', icon: '🔵', lucideIcon: ArrowDown },
    { value: 'Medium', label: 'Средний', short: 'Сред.', color: '#eab308', icon: '🟡', lucideIcon: Flag },
    { value: 'High', label: 'Высокий', short: 'Выс.', color: '#f97316', icon: '🟠', lucideIcon: AlertTriangle },
    { value: 'Critical', label: 'Критический', short: 'Крит.', color: '#ef4444', icon: '🔴', lucideIcon: AlertCircle },
];

export const getPriorityInfo = (priority) => {
    return TASK_PRIORITIES.find(p => p.value === priority) || TASK_PRIORITIES[0];
};

/** Цвет полосы слева на карточке. Для None — прозрачный */
export const getPriorityColor = (priority) => {
    const info = getPriorityInfo(priority);
    return info.value === 'None' ? 'transparent' : info.color;
};

// ─── Статусы проектов ────────────────────────────────
export const PROJECT_STATUSES = [
    { value: 'Completed', label: 'Завершен', icon: '✅', lucideIcon: CheckCircle2 },
    { value: 'Uncompleted', label: 'В процессе', icon: '⏳', lucideIcon: Clock },
];

// ─── Видимость проектов ──────────────────────────────
export const PROJECT_VISIBILITY = [
    { value: 'Public', label: 'Публичный', icon: '🌐', lucideIcon: Globe },
    { value: 'Private', label: 'Приватный', icon: '🔒', lucideIcon: EyeOff },
];

// ─── Хелперы ─────────────────────────────────────────

// Получить название категории по значению
export const getCategoryName = (value) => {
    const category = PROJECT_CATEGORIES.find(c => c.value === value);
    return category ? category.label : value;
};

// Получить название статуса по значению
export const getStatusName = (value) => {
    const status = PROJECT_STATUSES.find(s => s.value === value);
    return status ? status.label : value;
};

// Получить название видимости по значению
export const getVisibilityName = (value) => {
    const visibility = PROJECT_VISIBILITY.find(v => v.value === value);
    return visibility ? visibility.label : value;
};