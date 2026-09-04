// projecthub.client/src/utils/constants.js

// Категории проектов (соответствуют бэкенду)
export const PROJECT_CATEGORIES = [
    { value: 'Education', label: '📚 Учебный проект' },
    { value: 'Coursework', label: '📝 Курсовая работа' },
    { value: 'Diploma', label: '🎓 Дипломный проект' },
    { value: 'WebDevelopment', label: '🌐 Веб-разработка' },
    { value: 'MobileDevelopment', label: '📱 Мобильная разработка' },
    { value: 'DesktopDevelopment', label: '💻 Десктопное ПО' },
    { value: 'GameDevelopment', label: '🎮 Разработка игр' },
    { value: 'DevOps', label: '🚀 DevOps' },
    { value: 'DataScience', label: '📊 Data Science / AI' },
    { value: 'Cybersecurity', label: '🔐 Кибербезопасность' },
    { value: 'Design', label: '🎨 Дизайн' },       
    { value: 'Backend', label: '⚙️ Бэкенд' },      
    { value: 'Frontend', label: '🖥️ Фронтенд' },    
    { value: 'QA', label: '🧪 Тестирование' },      
    { value: 'Other', label: '🔹 Другое' }
];
export const SPECIALIZATIONS = [
    { value: 'Frontend', label: '🖥️ Фронтенд-разработчик' },
    { value: 'Backend', label: '⚙️ Бэкенд-разработчик' },
    { value: 'Designer', label: '🎨 Дизайнер' },
    { value: 'DevOps', label: '🚀 DevOps-инженер' },
    { value: 'QA', label: '🧪 Тестировщик' },
    { value: 'ProjectManager', label: '📋 Project-менеджер' },
    { value: 'Analyst', label: '📊 Аналитик' },
    { value: 'FullStack', label: '🔷 Full-stack разработчик' },
    { value: 'Mobile', label: '📱 Мобильный разработчик' },
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