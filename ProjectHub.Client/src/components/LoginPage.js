// projecthub.client/src/components/LoginPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/components/LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/projects'); // 👈 РЕДИРЕКТ НА СТРАНИЦУ ПРОЕКТОВ
        } catch (err) {
            setError(err.message || 'Неверный email или пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-box">
                    <div className="login-header">
                        <h1>📁 ProjectHub</h1>
                        <p>Войдите в свой аккаунт</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                required
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
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
                            className="btn-login"
                            disabled={loading}
                        >
                            {loading ? '⏳ Вход...' : '🚪 Войти'}
                        </button>

                        <div className="login-footer">
                            <p>
                                Нет аккаунта?{' '}
                                <Link to="/register" className="link-btn">
                                    Зарегистрироваться
                                </Link>
                            </p>
                        </div>
                    </form>

                    <div className="login-demo">
                        <p>📌 Демо-аккаунт:</p>
                        <p><strong>Email:</strong> anna@example.com</p>
                        <p><strong>Пароль:</strong> 123456</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;