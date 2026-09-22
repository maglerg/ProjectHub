// projecthub.client/src/components/RegisterPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Folder, UserPlus, Loader2, X, Monitor, Server, Palette, Rocket, FlaskConical, ClipboardList, BarChart3, Layers, Smartphone, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/RegisterPage.css';

const SPECIALIZATIONS = [
    { value: 'Frontend', label: 'Фронтенд-разработчик', icon: Monitor },
    { value: 'Backend', label: 'Бэкенд-разработчик', icon: Server },
    { value: 'Designer', label: 'Дизайнер', icon: Palette },
    { value: 'DevOps', label: 'DevOps-инженер', icon: Rocket },
    { value: 'QA', label: 'Тестировщик', icon: FlaskConical },
    { value: 'ProjectManager', label: 'Project-менеджер', icon: ClipboardList },
    { value: 'Analyst', label: 'Аналитик', icon: BarChart3 },
    { value: 'FullStack', label: 'Full-stack разработчик', icon: Layers },
    { value: 'Mobile', label: 'Мобильный разработчик', icon: Smartphone },
    { value: 'Other', label: 'Другое', icon: Circle },
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
                        <h1>
                            <Folder size={28} />
                            ProjectHub
                        </h1>
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
                                <X size={14} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn--primary btn--lg btn--block"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="icon-spin" />
                                    Регистрация...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Зарегистрироваться
                                </>
                            )}
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