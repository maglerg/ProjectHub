// src/utils/formatBytes.js

/**
 * Форматирует размер в байтах в человекочитаемый вид.
 *   0             → "0 Б"
 *   1024          → "1.0 КБ"
 *   1536000       → "1.5 МБ"
 *   1200000000    → "1.1 ГБ"
 */
export const formatBytes = (bytes) => {
    if (!bytes || bytes < 0) return '0 Б';

    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
};