// src/utils/constants.js

export const CATEGORIES = {
    0: 'Образование',
    1: 'Курсовая работа',
    2: 'Дипломный проект',
    3: 'Веб-разработка',
    4: 'Мобильная разработка',
    5: 'Десктопное ПО',
    6: 'Разработка игр',
    7: 'DevOps',
    8: 'Data Science / AI',
    9: 'Кибербезопасность',
    10: 'Стартап',
    11: 'Фриланс',
    12: 'Коммерческий проект',
    13: 'Дизайн',
    14: 'Создание контента',
    15: 'Исследовательский проект',
    16: 'Личный проект',
    17: 'Другое'
};

export const VISIBILITY = {
    0: 'Приватный',
    1: 'Публичный'
};

// Вспомогательные функции
export const getCategoryName = (value) => {
    return CATEGORIES[value] || 'Неизвестно';
};

export const getVisibilityName = (value) => {
    return VISIBILITY[value] || 'Неизвестно';
};

// Массив для отображения в select
export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, label]) => ({
    value: parseInt(value),
    label
}));