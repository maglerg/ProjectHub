// projecthub.client/src/components/FriendRequestsPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncomingFriendRequests, processFriendRequest } from '../services/friendRequestsApi';
import '../styles/components/FriendRequestsPage.css';

const FriendRequestsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        loadFriendRequests();
    }, []);

    const loadFriendRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('📥 Загрузка заявок в друзья...');
            const data = await getIncomingFriendRequests();
            console.log('📦 Получены заявки:', data);

            if (Array.isArray(data)) {
                setRequests(data);
            } else {
                setRequests([]);
            }
        } catch (err) {
            console.error('❌ Ошибка загрузки заявок:', err);
            setError(err.message || 'Ошибка загрузки заявок');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (requestId, approve) => {
        if (!requestId) {
            setError('Ошибка: ID заявки не найден');
            return;
        }

        setProcessing(requestId);
        setError(null);
        setSuccess(null);

        try {
            console.log(`🔄 Обработка заявки ${requestId}: ${approve ? 'Принять' : 'Отклонить'}`);
            await processFriendRequest(requestId, approve);
            setSuccess(approve ? '✅ Заявка принята!' : '❌ Заявка отклонена');

            // Обновляем список
            await loadFriendRequests();

            // Скрываем сообщение через 3 секунды
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('❌ Ошибка обработки:', err);
            setError(err.message || 'Ошибка обработки заявки');
            setTimeout(() => setError(null), 3000);
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    };

    if (loading) {
        return (
            <div className="friend-requests-loading">
                <div className="spinner">⏳</div>
                <p>Загрузка заявок...</p>
            </div>
        );
    }

    if (error && requests.length === 0) {
        return (
            <div className="friend-requests-error">
                <div className="error-icon">❌</div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Вернуться к проектам
                </button>
            </div>
        );
    }

    const pendingRequests = requests.filter(r => r.status === 'Pending');
    const allRequests = requests;

    return (
        <div className="friend-requests-page">
            <header className="friend-requests-header">
                <button className="btn-back" onClick={() => navigate('/projects')}>
                    ← Назад
                </button>
                <h1>👋 Заявки в друзья</h1>
                <span className="requests-count">
                    {pendingRequests.length} новых
                </span>
            </header>

            <div className="friend-requests-content">
                <div className="friend-requests-filters">
                    <button
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        ⏳ Ожидают ({pendingRequests.length})
                    </button>
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        📋 Все ({allRequests.length})
                    </button>
                </div>

                {success && (
                    <div className="success-message">{success}</div>
                )}
                {error && (
                    <div className="error-message">{error}</div>
                )}

                <div className="friend-requests-list">
                    {(filter === 'pending' ? pendingRequests : allRequests).length === 0 ? (
                        <div className="no-requests">
                            <div className="no-icon">📭</div>
                            <h3>Нет заявок</h3>
                            <p>Все заявки обработаны</p>
                        </div>
                    ) : (
                        (filter === 'pending' ? pendingRequests : allRequests).map(request => (
                            <div key={request.id} className="friend-request-card">
                                <div className="request-header">
                                    <div className="request-user">
                                        <div className="request-avatar">
                                            {request.senderName ? request.senderName[0].toUpperCase() : '👤'}
                                        </div>
                                        <div className="request-info">
                                            <div className="request-title">
                                                {request.senderName} хочет добавить вас в друзья
                                            </div>
                                            <div className="request-sender-email">
                                                📧 {request.senderEmail}
                                            </div>
                                            {request.message && (
                                                <div className="request-message">
                                                    💬 {request.message}
                                                </div>
                                            )}
                                            <div className="request-time">
                                                📅 {formatDate(request.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="request-status">
                                        <span className={`status-badge ${request.status.toLowerCase()}`}>
                                            {request.status === 'Pending' ? '⏳ Ожидает' :
                                                request.status === 'Accepted' ? '✅ Принята' :
                                                    request.status === 'Rejected' ? '❌ Отклонена' :
                                                        request.status === 'Canceled' ? '↩️ Отменена' :
                                                            request.status}
                                        </span>
                                    </div>
                                </div>

                                {request.status === 'Pending' && (
                                    <div className="request-actions">
                                        <button
                                            className="btn-approve"
                                            onClick={() => handleProcess(request.id, true)}
                                            disabled={processing === request.id}
                                        >
                                            {processing === request.id ? '⏳' : '✅ Принять'}
                                        </button>
                                        <button
                                            className="btn-reject"
                                            onClick={() => handleProcess(request.id, false)}
                                            disabled={processing === request.id}
                                        >
                                            {processing === request.id ? '⏳' : '❌ Отклонить'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FriendRequestsPage;