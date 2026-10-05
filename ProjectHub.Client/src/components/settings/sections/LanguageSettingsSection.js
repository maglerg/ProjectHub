// projecthub.client/src/components/settings/sections/LanguageSettingsSection.js

import React from 'react';
import { Globe, Flag } from 'lucide-react';
import '../../../styles/components/SettingsPlaceholder.css';

export default function LanguageSettingsSection() {
    return (
        <div className="settings-placeholder">
            <div className="settings-placeholder-icon">
                <Globe size={40} />
            </div>
            <h3>Язык и регион</h3>
            <p>
                Выбор языка интерфейса и формата даты появится здесь в ближайшее время.
            </p>

            <div className="placeholder-preview">
                <div className="placeholder-item">
                    <Flag size={20} />
                    <span>Русский</span>
                    <span className="placeholder-badge placeholder-badge--current">Текущий</span>
                </div>
                <div className="placeholder-item">
                    <Flag size={20} />
                    <span>English</span>
                    <span className="placeholder-badge">Скоро</span>
                </div>
            </div>
        </div>
    );
}