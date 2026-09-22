// projecthub.client/src/components/FriendRequestsPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    UserPlus,
    Loader2,
    X,
    Check,
    Undo2,
    Inbox,
    Mail,
    MessageCircle,
    Calendar,
    ClipboardList,
} from 'lucide-react';
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
                <div className="spinner">
                    <Loader2 size={32} className="icon-spin" />
                </div>
                <p>Загрузка заявок...</p>
            </div>
        );
    }

    if (error && requests.length === 0) {
        return (
            <div className="friend-requests-error">
                <div className="error-icon">
                    <X size={32} />
                </div>
                <h3>Ошибка</h3>
                <p>{error}</p>
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Вернуться к проектам
                </button>
            </div>
        );
    }

    const pendingRequests = requests.filter(r => r.status === 'Pending');
    const allRequests = requests;

    return (
        <div className="friend-requests-page">
            <header className="friend-requests-header">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => navigate('/projects')}
                >
                    <ArrowLeft size={16} />
                    Назад
                </button>
                <h1>
                    <UserPlus size={24} />
                    Заявки в друзья
                </h1>
                <span className="requests-count">
                    {pendingRequests.length} новых
                </span>
            </header>

            <div className="friend-requests-content">
                <div className="friend-requests-filters">
                    <button
                        type="button"
                        className={`btn btn--sm friend-requests-filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        <Loader2 size={14} />
                        Ожидают ({pendingRequests.length})
                    </button>
                    <button
                        type="button"
                        className={`btn btn--sm friend-requests-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        <ClipboardList size={14} />
                        Все ({allRequests.length})
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
                            <div className="no-icon">
                                <Inbox size={32} />
                            </div>
                            <h3>Нет заявок</h3>
                            <p>Все заявки обработаны</p>
                        </div>
                    ) : (
                        (filter === 'pending' ? pendingRequests : allRequests).map(request => (
                            <div key={request.id} className="friend-request-card">
                                <div className="request-header">
                                    <div className="request-user">
                                        <div className="request-avatar">
                                            {request.senderName
                                                ? request.senderName[0].toUpperCase()
                                                : <UserPlus size={20} />}
                                        </div>
                                        <div className="request-info">
                                            <div className="request-title">
                                                {request.senderName} хочет добавить вас в друзья
                                            </div>
                                            <div className="request-sender-email">
                                                <Mail size={12} />
                                                {request.senderEmail}
                                            </div>
                                            {request.message && (
                                                <div className="request-message">
                                                    <MessageCircle size={12} />
                                                    {request.message}
                                                </div>
                                            )}
                                            <div className="request-time">
                                                <Calendar size={12} />
                                                {formatDate(request.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="request-status">
                                        <span className={`status-badge ${request.status.toLowerCase()}`}>
                                            {request.status === 'Pending' && (
                                                <>
                                                    <Loader2 size={12} />
                                                    Ожидает
                                                </>
                                            )}
                                            {request.status === 'Accepted' && (
                                                <>
                                                    <Check size={12} />
                                                    Принята
                                                </>
                                            )}
                                            {request.status === 'Rejected' && (
                                                <>
                                                    <X size={12} />
                                                    Отклонена
                                                </>
                                            )}
                                            {request.status === 'Canceled' && (
                                                <>
                                                    <Undo2 size={12} />
                                                    Отменена
                                                </>
                                            )}
                                            {!['Pending', 'Accepted', 'Rejected', 'Canceled'].includes(request.status) && request.status}
                                        </span>
                                    </div>
                                </div>

                                {request.status === 'Pending' && (
                                    <div className="request-actions">
                                        <button
                                            type="button"
                                            className="btn btn--primary btn--sm"
                                            onClick={() => handleProcess(request.id, true)}
                                            disabled={processing === request.id}
                                        >
                                            {processing === request.id ? (
                                                <>
                                                    <Loader2 size={14} className="icon-spin" />
                                                    Обработка…
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={14} />
                                                    Принять
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--danger-outline btn--sm"
                                            onClick={() => handleProcess(request.id, false)}
                                            disabled={processing === request.id}
                                        >
                                            {processing === request.id ? (
                                                <>
                                                    <Loader2 size={14} className="icon-spin" />
                                                    Обработка…
                                                </>
                                            ) : (
                                                <>
                                                    <X size={14} />
                                                    Отклонить
                                                </>
                                            )}
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