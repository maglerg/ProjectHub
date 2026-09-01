// projecthub.client/src/components/RegisterPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/components/RegisterPage.css';

const SPECIALIZATIONS = [
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

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        specialization: 'Frontend',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            setLoading(false);
            return;
        }

        try {
            const { confirmPassword, ...registerData } = formData;
            await register(registerData);
            navigate('/projects'); // 👈 РЕДИРЕКТ НА СТРАНИЦУ ПРОЕКТОВ
        } catch (err) {
            setError(err.message || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-box">
                    <div className="register-header">
                        <h1>📁 ProjectHub</h1>
                        <p>Создайте новый аккаунт</p>
                    </div>

                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-group">
                            <label>Имя *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Иван Иванов"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="example@email.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Пароль *</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Минимум 6 символов"
                                required
                                disabled={loading}
                                minLength="6"
                            />
                        </div>

                        <div className="form-group">
                            <label>Подтвердите пароль *</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Повторите пароль"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Специализация *</label>
                            <select
                                name="specialization"
                                value={formData.specialization}
                                onChange={handleChange}
                                required
                                disabled={loading}
                            >
                                {SPECIALIZATIONS.map(spec => (
                                    <option key={spec.value} value={spec.value}>
                                        {spec.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>О себе</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Расскажите о своем опыте..."
                                rows="3"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                ❌ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-register"
                            disabled={loading}
                        >
                            {loading ? '⏳ Регистрация...' : '📝 Зарегистрироваться'}
                        </button>

                        <div className="register-footer">
                            <p>
                                Уже есть аккаунт?{' '}
                                <Link to="/login" className="link-btn">
                                    Войти
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;