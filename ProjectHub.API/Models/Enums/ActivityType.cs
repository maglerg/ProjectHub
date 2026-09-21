namespace ProjectHub.API.Models.Enums
{
    public enum ActivityType
    {
        // ── Проект ──
        ProjectCreated = 1,
        ProjectUpdated = 2,
        ProjectDeleted = 3,
        ProjectVisibilityChanged = 4,
        ProjectDeadlineChanged = 5,
        ProjectArchived = 6,
        ProjectUnarchived = 7,


        // ── Участники ──
        MemberJoined = 10,
        MemberInvited = 11,
        MemberRemoved = 12,
        MemberRoleChanged = 13,

        // ── Приглашения / заявки ──
        InvitationSent = 20,
        InvitationAccepted = 21,
        InvitationDeclined = 22,
        ApplicationSubmitted = 23,
        ApplicationApproved = 24,
        ApplicationRejected = 25,

        // ── Задачи ──
        TaskCreated = 30,
        TaskUpdated = 31,
        TaskMoved = 32,
        TaskTaken = 33,
        TaskLeft = 34,
        TaskDeleted = 35,
        TaskPriorityChanged = 36,
        TaskDueDateChanged = 37,
        TaskCompleted = 38,

        // ── Подзадачи ──
        SubtaskAdded = 40,
        SubtaskCompleted = 41,
        SubtaskUncompleted = 42,
        SubtaskDeleted = 43,

        // ── Комментарии ──
        CommentAdded = 50,

        // ── Вложения ──
        AttachmentAdded = 60,
        AttachmentDeleted = 61,

        // ── Теги ──
        TagAdded = 70,
        TagRemoved = 71,
        TagCreated = 72,
        TagDeleted = 73,

        // ── Голосования ──
        VotingCreated = 80,
        VotingClosed = 81,
        VotingVoted = 82,

        // ── Чат проекта ──
        ProjectChatMessageSent = 90
    }
}