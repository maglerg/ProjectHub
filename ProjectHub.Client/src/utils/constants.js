// projecthub.client/src/utils/constants.js

// Категории проектов (соответствуют бэкенду)
export const PROJECT_CATEGORIES = [
    { value: 'Web', label: '🌐 Веб-разработка' },
    { value: 'Mobile', label: '📱 Мобильная разработка' },
    { value: 'Design', label: '🎨 Дизайн' },
    { value: 'Backend', label: '⚙️ Бэкенд' },
    { value: 'DevOps', label: '🚀 DevOps' },
    { value: 'QA', label: '🧪 Тестирование' },
    { value: 'DataScience', label: '📊 Data Science' },
    { value: 'GameDev', label: '🎮 GameDev' },
    { value: 'Embedded', label: '🔌 Встроенные системы' },
    { value: 'Other', label: '🔹 Другое' }
];

// Статусы проектов
export const PROJECT_STATUSES = [
    { value: 'Completed', label: '✅ Завершен' },
    { value: 'Uncompleted', label: '⏳ В процессе' }
];

// Видимость проектов
export const PROJECT_VISIBILITY = [
    { value: 'Public', label: '🌐 Публичный' },
    { value: 'Private', label: '🔒 Приватный' }
];

// Получить название категории по значению
export const getCategoryName = (value) => {
    const category = PROJECT_CATEGORIES.find(c => c.value === value);
    return category ? category.label : value;
};

// Получить название статуса по значению (ТОЛЬКО ОДНА ФУНКЦИЯ!)
export const getStatusName = (value) => {
    const status = PROJECT_STATUSES.find(s => s.value === value);
    return status ? status.label : value;
};

// Получить название видимости по значению
export const getVisibilityName = (value) => {
    const visibility = PROJECT_VISIBILITY.find(v => v.value === value);
    return visibility ? visibility.label : value;
};