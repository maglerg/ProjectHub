// projecthub.client/src/components/EmojiPicker.js

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import '../styles/components/EmojiPicker.css';

/**
 * Простая панель эмодзи.
 * - Категории (табы) + поиск по ключевым словам.
 * - Регулярный набор эмодзи, без внешних зависимостей.
 */
const EMOJI_DATA = {
    'Часто используемые': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
        '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '👋',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❤️‍🔥',
        '🔥', '✨', '⭐', '🌟', '💯', '🎉', '🎊', '🥳', '🎁', '🎈',
    ],
    'Смайлы': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
        '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
        '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
        '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
        '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
        '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧',
        '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
        '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀',
    ],
    'Жесты': [
        '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
        '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌',
        '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    ],
    'Животные': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
        '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
        '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
        '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
    ],
    'Еда': [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒',
        '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
        '🍞', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓',
        '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥘',
        '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚',
        '☕', '🍵', '🧋', '🥤', '🍺', '🍻', '🍷', '🍸', '🍹', '🥂',
    ],
    'Активности': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
        '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
        '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
        '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
    ],
    'Символы': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
        '✝️', '☪️', '🕉️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎',
        '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑',
        '✅', '❌', '❎', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢',
        '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶',
    ],
};

const EmojiPicker = ({ onSelect, onClose, anchorRef }) => {
    const pickerRef = useRef(null);
    const [activeCategory, setActiveCategory] = useState('Часто используемые');
    const [search, setSearch] = useState('');

    // ── Закрытие по клику вне / Escape ──
    useEffect(() => {
        const handleClickOutside = (e) => {
            const isInsidePicker = pickerRef.current?.contains(e.target);
            const isAnchor = anchorRef?.current?.contains(e.target);

            if (!isInsidePicker && !isAnchor) {
                onClose();
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose, anchorRef]);

    // ── Поиск (простой: показываем всё, что совпадает с названием категории) ──
    const categories = Object.keys(EMOJI_DATA);
    const visibleCategories = useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.trim().toLowerCase();
        return categories.filter((c) => c.toLowerCase().includes(q));
    }, [search, categories]);

    const handleSelect = (emoji) => {
        onSelect(emoji);
    };

    return (
        <div className="emoji-picker" ref={pickerRef}>
            {/* ── Поиск ── */}
            <div className="emoji-picker__search">
                <span className="emoji-picker__search-icon">
                    <Search size={14} />
                </span>
                <input
                    type="text"
                    className="emoji-picker__search-input"
                    placeholder="Поиск категорий..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm emoji-picker__search-clear"
                        onClick={() => setSearch('')}
                        title="Очистить"
                        aria-label="Очистить"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* ── Табы категорий ── */}
            <div className="emoji-picker__tabs">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        className={`emoji-picker__tab ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                        title={cat}
                    >
                        {EMOJI_DATA[cat][0]}
                    </button>
                ))}
            </div>

            {/* ── Сетка эмодзи ── */}
            <div className="emoji-picker__body">
                {visibleCategories.length === 0 ? (
                    <div className="emoji-picker__empty">
                        Категория «{search}» не найдена
                    </div>
                ) : (
                    visibleCategories.map((cat) => (
                        <div key={cat} className="emoji-picker__section">
                            <div className="emoji-picker__section-title">{cat}</div>
                            <div className="emoji-picker__grid">
                                {EMOJI_DATA[cat].map((emoji, idx) => (
                                    <button
                                        key={`${cat}-${idx}`}
                                        type="button"
                                        className="emoji-picker__item"
                                        onClick={() => handleSelect(emoji)}
                                        title={emoji}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EmojiPicker;