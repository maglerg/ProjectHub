// src/components/tasks/TaskComments.js

import React, { useState, useRef, useEffect } from 'react';
import { X, Reply, Send, Loader2, AlertCircle } from 'lucide-react';
import { getTaskComments, addTaskComment } from '../../services/tasksApi';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../UserAvatar';
import { formatRelativeTime } from '../../utils/datetime';
import '../../styles/components/tasks/tasks.css';

/**
 * Секция комментариев к задаче с поддержкой ответов (1 уровень вложенности).
 */
export default function TaskComments({
    projectCode,
    taskId,
    isArchived = false,
}) {
    const { user } = useAuth();

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Новый корневой комментарий
    const [newText, setNewText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Активный ответ (какой commentId сейчас раскрыт)
    const [replyToId, setReplyToId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);

    const rootTextareaRef = useRef(null);

    // ── Загрузка комментариев ──
    const loadComments = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getTaskComments(projectCode, taskId);
            setComments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('❌ Ошибка загрузки комментариев:', err);
            setError(err.message || 'Не удалось загрузить комментарии');
            setComments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectCode && taskId) {
            loadComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectCode, taskId]);

    // ── Добавить корневой комментарий ──
    const handleSubmitRoot = async (e) => {
        e.preventDefault();
        if (isArchived) return;
        if (!newText.trim() || submitting) return;

        setSubmitting(true);
        try {
            const created = await addTaskComment(
                projectCode,
                taskId,
                newText.trim(),
                null
            );
            setNewText('');
            await loadComments();
            // Прокрутить к новому комментарию?
        } catch (err) {
            console.error('❌ Ошибка добавления комментария:', err);
            setError(err.message || 'Не удалось отправить комментарий');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Открыть форму ответа ──
    const handleOpenReply = (comment) => {
        if (isArchived) return;
        setReplyToId(comment.id);
        setReplyText('');
        // Фокус в textarea произойдёт через autoFocus
    };

    // ── Отменить ответ ──
    const handleCancelReply = () => {
        setReplyToId(null);
        setReplyText('');
    };

    // ── Отправить ответ ──
    const handleSubmitReply = async (e, parentCommentId) => {
        e.preventDefault();
        if (isArchived) return;
        if (!replyText.trim() || replySubmitting) return;

        setReplySubmitting(true);
        try {
            await addTaskComment(
                projectCode,
                taskId,
                replyText.trim(),
                parentCommentId
            );
            setReplyText('');
            setReplyToId(null);
            await loadComments();
        } catch (err) {
            console.error('❌ Ошибка отправки ответа:', err);
            setError(err.message || 'Не удалось отправить ответ');
        } finally {
            setReplySubmitting(false);
        }
    };

    // ── Enter — отправить, Shift+Enter — новая строка ──
    const handleKeyDown = (e, submitFn) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitFn(e);
        }
    };

    // ── Аватар + имя автора ──
    const renderAuthor = (authorName, authorEmail, authorAvatarUrl, authorSpecialization) => (
        <div className="comment-author-info">
            <UserAvatar
                avatarUrl={authorAvatarUrl}
                name={authorName}
                email={authorEmail}
                size="sm"
            />
            <div className="comment-author-text">
                <span className="comment-author-name">{authorName || 'Пользователь'}</span>
                {authorSpecialization && (
                    <span className="comment-author-spec">{authorSpecialization}</span>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="task-comments">
                <h3>Комментарии</h3>
                <div className="comments-loading">Загрузка…</div>
            </div>
        );
    }

    // ── Рендер одного ответа ──
    const renderReply = (reply) => (
        <div key={reply.id} className="comment-reply">
            <div className="comment-header">
                {renderAuthor(
                    reply.authorName,
                    reply.authorEmail,
                    reply.authorAvatarUrl,
                    reply.authorSpecialization
                )}

                <div className="comment-header-right">
                    {reply.replyToUserName && (
                        <span className="comment-reply-to">
                            → <b>@{reply.replyToUserName}</b>
                        </span>
                    )}
                    <span className="comment-date">
                        {formatRelativeTime(reply.createdAt)}
                    </span>
                </div>
            </div>

            <div className="comment-text">{reply.text}</div>
        </div>
    );

    return (
        <div className="task-comments">
            <h3>Комментарии {comments.length > 0 && `(${comments.length})`}</h3>

            {error && (
                <div className="comments-error">
                    <AlertCircle size={14} />
                    {error}
                    <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        onClick={() => setError(null)}
                        aria-label="Закрыть"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Список комментариев ── */}
            {comments.length === 0 ? (
                <div className="comments-empty">
                    Комментариев пока нет. Начните обсуждение!
                </div>
            ) : (
                <div className="comments-list">
                    {comments.map((comment) => (
                        <div key={comment.id} className="comment-item">
                            {/* ── Корневой комментарий ── */}
                            <div className="comment-root">
                                <div className="comment-header">
                                    {renderAuthor(
                                        comment.authorName,
                                        comment.authorEmail,
                                        comment.authorAvatarUrl,
                                        comment.authorSpecialization
                                    )}
                                    <span className="comment-date">
                                        {formatRelativeTime(comment.createdAt)}
                                    </span>
                                </div>

                                <div className="comment-text">{comment.text}</div>

                                {!isArchived && (
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--sm comment-reply-btn"
                                        onClick={() => handleOpenReply(comment)}
                                    >
                                        <Reply size={14} />
                                        Ответить
                                    </button>
                                )}
                            </div>

                            {/* ── Форма ответа ── */}
                            {replyToId === comment.id && (
                                <form
                                    className="comment-reply-form"
                                    onSubmit={(e) => handleSubmitReply(e, comment.id)}
                                >
                                    <div className="comment-reply-context">
                                        Ответ на комментарий <b>{comment.authorName}</b>
                                    </div>
                                    <textarea
                                        className="comment-textarea"
                                        placeholder="Введите ответ…"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) =>
                                            handleKeyDown(e, (ev) =>
                                                handleSubmitReply(ev, comment.id)
                                            )
                                        }
                                        rows="2"
                                        autoFocus
                                        disabled={replySubmitting}
                                    />
                                    <div className="comment-form-actions">
                                        <button
                                            type="button"
                                            className="btn btn--secondary btn--sm"
                                            onClick={handleCancelReply}
                                            disabled={replySubmitting}
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn--primary btn--sm"
                                            disabled={replySubmitting || !replyText.trim()}
                                        >
                                            {replySubmitting ? (
                                                <>
                                                    <Loader2 size={14} className="icon-spin" />
                                                    Отправка…
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={14} />
                                                    Отправить
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* ── Ответы ── */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="comment-replies">
                                    {comment.replies.map(renderReply)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Форма нового корневого комментария ── */}
            {!isArchived && (
                <form className="comment-new-form" onSubmit={handleSubmitRoot}>
                    <textarea
                        ref={rootTextareaRef}
                        className="comment-textarea"
                        placeholder="Написать комментарий…"
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleSubmitRoot)}
                        rows="3"
                        disabled={submitting}
                    />
                    <div className="comment-form-actions">
                        <button
                            type="submit"
                            className="btn btn--primary btn--sm"
                            disabled={submitting || !newText.trim()}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="icon-spin" />
                                    Отправка…
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    Отправить
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}