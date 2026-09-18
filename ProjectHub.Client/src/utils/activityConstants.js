export const ACTIVITY_TYPE_INFO = {
    // Проект
    ProjectCreated: { icon: '📁', label: 'Создан проект', group: 'project' },
    ProjectUpdated: { icon: '✏️', label: 'Обновлён проект', group: 'project' },
    ProjectDeleted: { icon: '🗑️', label: 'Удалён проект', group: 'project' },
    ProjectVisibilityChanged: { icon: '👁️', label: 'Изменена видимость', group: 'project' },
    ProjectDeadlineChanged: { icon: '📅', label: 'Изменён дедлайн', group: 'project' },

    // Участники
    MemberJoined: { icon: '👋', label: 'Вступление в проект', group: 'members' },
    MemberInvited: { icon: '📩', label: 'Приглашение', group: 'members' },
    MemberRemoved: { icon: '🚪', label: 'Удалён участник', group: 'members' },
    MemberRoleChanged: { icon: '🔄', label: 'Смена роли', group: 'members' },

    // Приглашения / заявки
    InvitationSent: { icon: '📤', label: 'Отправлено приглашение', group: 'invitations' },
    InvitationAccepted: { icon: '✅', label: 'Принято приглашение', group: 'invitations' },
    InvitationDeclined: { icon: '❌', label: 'Отклонено приглашение', group: 'invitations' },
    ApplicationSubmitted: { icon: '📨', label: 'Подана заявка', group: 'applications' },
    ApplicationApproved: { icon: '✅', label: 'Заявка одобрена', group: 'applications' },
    ApplicationRejected: { icon: '❌', label: 'Заявка отклонена', group: 'applications' },

    // Задачи
    TaskCreated: { icon: '➕', label: 'Создана задача', group: 'tasks' },
    TaskUpdated: { icon: '✏️', label: 'Обновлена задача', group: 'tasks' },
    TaskMoved: { icon: '➡️', label: 'Перемещена задача', group: 'tasks' },
    TaskTaken: { icon: '✋', label: 'Взята задача', group: 'tasks' },
    TaskLeft: { icon: '↩️', label: 'Снят с задачи', group: 'tasks' },
    TaskDeleted: { icon: '🗑️', label: 'Удалена задача', group: 'tasks' },
    TaskPriorityChanged: { icon: '🚩', label: 'Изменён приоритет', group: 'tasks' },
    TaskDueDateChanged: { icon: '📅', label: 'Изменён дедлайн', group: 'tasks' },
    TaskCompleted: { icon: '🎉', label: 'Задача завершена', group: 'tasks' },

    // Подзадачи
    SubtaskAdded: { icon: '📝', label: 'Добавлена подзадача', group: 'subtasks' },
    SubtaskCompleted: { icon: '☑️', label: 'Подзадача выполнена', group: 'subtasks' },
    SubtaskUncompleted: { icon: '☐', label: 'Снята галочка', group: 'subtasks' },
    SubtaskDeleted: { icon: '🗑️', label: 'Удалена подзадача', group: 'subtasks' },

    // Комментарии
    CommentAdded: { icon: '💬', label: 'Комментарий', group: 'comments' },

    // Вложения
    AttachmentAdded: { icon: '📎', label: 'Файл прикреплён', group: 'attachments' },
    AttachmentDeleted: { icon: '🗑️', label: 'Файл удалён', group: 'attachments' },

    // Теги
    TagAdded: { icon: '🏷️', label: 'Тег добавлен', group: 'tags' },
    TagRemoved: { icon: '🏷️', label: 'Тег снят', group: 'tags' },
    TagCreated: { icon: '🏷️', label: 'Тег создан', group: 'tags' },
    TagDeleted: { icon: '🗑️', label: 'Тег удалён', group: 'tags' },

    // Голосования
    VotingCreated: { icon: '🗳️', label: 'Создано голосование', group: 'votings' },
    VotingClosed: { icon: '🔒', label: 'Голосование закрыто', group: 'votings' },
    VotingVoted: { icon: '✔️', label: 'Голос отдан', group: 'votings' },

    // Чат проекта
    ProjectChatMessageSent: { icon: '💬', label: 'Сообщение в чате', group: 'chat' }
};

export const ACTIVITY_FILTERS = [
    { value: 'all', label: 'Все события', icon: '🌐' },
    { value: 'tasks', label: 'Задачи', icon: '✅' },
    { value: 'subtasks', label: 'Подзадачи', icon: '📝' },
    { value: 'comments', label: 'Комментарии', icon: '💬' },
    { value: 'attachments', label: 'Файлы', icon: '📎' },
    { value: 'tags', label: 'Теги', icon: '🏷️' },
    { value: 'members', label: 'Участники', icon: '👥' },
    { value: 'invitations', label: 'Приглашения', icon: '📩' },
    { value: 'applications', label: 'Заявки', icon: '📨' },
    { value: 'votings', label: 'Голосования', icon: '🗳️' },
    { value: 'project', label: 'Проект', icon: '📁' },
    { value: 'chat', label: 'Чат', icon: '💬' }
];

export const getActivityInfo = (type) => {
    return ACTIVITY_TYPE_INFO[type] || { icon: '•', label: type, group: 'other' };
};