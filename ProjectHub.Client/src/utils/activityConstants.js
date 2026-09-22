// utils/activityConstants.js

import {
    Folder,
    Pencil,
    Trash2,
    Eye,
    Calendar,
    Hand,
    Mail,
    LogOut,
    RefreshCw,
    Send,
    Check,
    X,
    Inbox,
    Plus,
    ArrowRight,
    CheckCircle2,
    Flag,
    PartyPopper,
    FileText,
    CheckSquare,
    Square,
    MessageCircle,
    Paperclip,
    Tag,
    Vote,
    Lock,
    Globe,
    Users,
    Undo2,
    ListTodo,
} from 'lucide-react';

export const ACTIVITY_TYPE_INFO = {
    // Проект
    ProjectCreated: { icon: '📁', lucideIcon: Folder, label: 'Создан проект', group: 'project' },
    ProjectUpdated: { icon: '✏️', lucideIcon: Pencil, label: 'Обновлён проект', group: 'project' },
    ProjectDeleted: { icon: '🗑️', lucideIcon: Trash2, label: 'Удалён проект', group: 'project' },
    ProjectVisibilityChanged: { icon: '👁️', lucideIcon: Eye, label: 'Изменена видимость', group: 'project' },
    ProjectDeadlineChanged: { icon: '📅', lucideIcon: Calendar, label: 'Изменён дедлайн', group: 'project' },

    // Участники
    MemberJoined: { icon: '👋', lucideIcon: Hand, label: 'Вступление в проект', group: 'members' },
    MemberInvited: { icon: '📩', lucideIcon: Mail, label: 'Приглашение', group: 'members' },
    MemberRemoved: { icon: '🚪', lucideIcon: LogOut, label: 'Удалён участник', group: 'members' },
    MemberRoleChanged: { icon: '🔄', lucideIcon: RefreshCw, label: 'Смена роли', group: 'members' },

    // Приглашения / заявки
    InvitationSent: { icon: '📤', lucideIcon: Send, label: 'Отправлено приглашение', group: 'invitations' },
    InvitationAccepted: { icon: '✅', lucideIcon: Check, label: 'Принято приглашение', group: 'invitations' },
    InvitationDeclined: { icon: '❌', lucideIcon: X, label: 'Отклонено приглашение', group: 'invitations' },
    ApplicationSubmitted: { icon: '📨', lucideIcon: Inbox, label: 'Подана заявка', group: 'applications' },
    ApplicationApproved: { icon: '✅', lucideIcon: Check, label: 'Заявка одобрена', group: 'applications' },
    ApplicationRejected: { icon: '❌', lucideIcon: X, label: 'Заявка отклонена', group: 'applications' },

    // Задачи
    TaskCreated: { icon: '➕', lucideIcon: Plus, label: 'Создана задача', group: 'tasks' },
    TaskUpdated: { icon: '✏️', lucideIcon: Pencil, label: 'Обновлена задача', group: 'tasks' },
    TaskMoved: { icon: '➡️', lucideIcon: ArrowRight, label: 'Перемещена задача', group: 'tasks' },
    TaskTaken: { icon: '✋', lucideIcon: Hand, label: 'Взята задача', group: 'tasks' },
    TaskLeft: { icon: '↩️', lucideIcon: Undo2, label: 'Снят с задачи', group: 'tasks' },
    TaskDeleted: { icon: '🗑️', lucideIcon: Trash2, label: 'Удалена задача', group: 'tasks' },
    TaskPriorityChanged: { icon: '🚩', lucideIcon: Flag, label: 'Изменён приоритет', group: 'tasks' },
    TaskDueDateChanged: { icon: '📅', lucideIcon: Calendar, label: 'Изменён дедлайн', group: 'tasks' },
    TaskCompleted: { icon: '🎉', lucideIcon: PartyPopper, label: 'Задача завершена', group: 'tasks' },

    // Подзадачи
    SubtaskAdded: { icon: '📝', lucideIcon: FileText, label: 'Добавлена подзадача', group: 'subtasks' },
    SubtaskCompleted: { icon: '☑️', lucideIcon: CheckSquare, label: 'Подзадача выполнена', group: 'subtasks' },
    SubtaskUncompleted: { icon: '☐', lucideIcon: Square, label: 'Снята галочка', group: 'subtasks' },
    SubtaskDeleted: { icon: '🗑️', lucideIcon: Trash2, label: 'Удалена подзадача', group: 'subtasks' },

    // Комментарии
    CommentAdded: { icon: '💬', lucideIcon: MessageCircle, label: 'Комментарий', group: 'comments' },

    // Вложения
    AttachmentAdded: { icon: '📎', lucideIcon: Paperclip, label: 'Файл прикреплён', group: 'attachments' },
    AttachmentDeleted: { icon: '🗑️', lucideIcon: Trash2, label: 'Файл удалён', group: 'attachments' },

    // Теги
    TagAdded: { icon: '🏷️', lucideIcon: Tag, label: 'Тег добавлен', group: 'tags' },
    TagRemoved: { icon: '🏷️', lucideIcon: Tag, label: 'Тег снят', group: 'tags' },
    TagCreated: { icon: '🏷️', lucideIcon: Tag, label: 'Тег создан', group: 'tags' },
    TagDeleted: { icon: '🗑️', lucideIcon: Trash2, label: 'Тег удалён', group: 'tags' },

    // Голосования
    VotingCreated: { icon: '🗳️', lucideIcon: Vote, label: 'Создано голосование', group: 'votings' },
    VotingClosed: { icon: '🔒', lucideIcon: Lock, label: 'Голосование закрыто', group: 'votings' },
    VotingVoted: { icon: '✔️', lucideIcon: Check, label: 'Голос отдан', group: 'votings' },

    // Чат проекта
    ProjectChatMessageSent: { icon: '💬', lucideIcon: MessageCircle, label: 'Сообщение в чате', group: 'chat' }
};

export const ACTIVITY_FILTERS = [
    { value: 'all', label: 'Все события', icon: '🌐', lucideIcon: Globe },
    { value: 'tasks', label: 'Задачи', icon: '✅', lucideIcon: ListTodo },
    { value: 'subtasks', label: 'Подзадачи', icon: '📝', lucideIcon: FileText },
    { value: 'comments', label: 'Комментарии', icon: '💬', lucideIcon: MessageCircle },
    { value: 'attachments', label: 'Файлы', icon: '📎', lucideIcon: Paperclip },
    { value: 'tags', label: 'Теги', icon: '🏷️', lucideIcon: Tag },
    { value: 'members', label: 'Участники', icon: '👥', lucideIcon: Users },
    { value: 'invitations', label: 'Приглашения', icon: '📩', lucideIcon: Mail },
    { value: 'applications', label: 'Заявки', icon: '📨', lucideIcon: Inbox },
    { value: 'votings', label: 'Голосования', icon: '🗳️', lucideIcon: Vote },
    { value: 'project', label: 'Проект', icon: '📁', lucideIcon: Folder },
    { value: 'chat', label: 'Чат', icon: '💬', lucideIcon: MessageCircle }
];

export const getActivityInfo = (type) => {
    return ACTIVITY_TYPE_INFO[type] || {
        icon: '•',
        lucideIcon: null,
        label: type,
        group: 'other'
    };
};