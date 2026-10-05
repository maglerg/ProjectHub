namespace ProjectHub.API.Models.Enums
{
    public enum NotificationType
    {
        ApplicationReceived,
        ApplicationApproved,
        ApplicationRejected,
        ProjectInvitation,
        NewMember,
        TaskAssigned,
        TaskCompleted,
        System,
        FriendRequest,
        FriendRequestAccepted,
        FriendRequestRejected,
        FriendRemoved,
        RoleChanged,
        RemovedFromProject,
        MemberRemoved,
        InvitationAccepted,
        InvitationRejected,
        NewMessage,
        NewVoting,
        NewTaskComment,

        // 🆕 Дедлайны задач
        TaskDeadlineSoon,
    }

    public enum NotificationGroup
    {
        Master,
        NewMessages,
        FriendRequests,
        ProjectInvitations,
        ProjectChanges,
        TaskComments,
        Votings,
        TaskDeadlines,
        Applications,
        System
    }

    public static class NotificationTypeExtensions
    {
        public static NotificationGroup GetGroup(this NotificationType type)
        {
            return type switch
            {
                NotificationType.NewMessage
                    => NotificationGroup.NewMessages,

                NotificationType.FriendRequest
                or NotificationType.FriendRequestAccepted
                or NotificationType.FriendRequestRejected
                or NotificationType.FriendRemoved
                    => NotificationGroup.FriendRequests,

                NotificationType.ProjectInvitation
                or NotificationType.InvitationAccepted
                or NotificationType.InvitationRejected
                    => NotificationGroup.ProjectInvitations,

                NotificationType.NewMember
                or NotificationType.MemberRemoved
                or NotificationType.RemovedFromProject
                or NotificationType.RoleChanged
                    => NotificationGroup.ProjectChanges,

                NotificationType.NewTaskComment
                or NotificationType.TaskAssigned
                or NotificationType.TaskCompleted
                    => NotificationGroup.TaskComments,

                NotificationType.NewVoting
                    => NotificationGroup.Votings,

                // 🆕
                NotificationType.TaskDeadlineSoon
                    => NotificationGroup.TaskDeadlines,

                NotificationType.ApplicationReceived
                or NotificationType.ApplicationApproved
                or NotificationType.ApplicationRejected
                    => NotificationGroup.Applications,

                NotificationType.System
                    => NotificationGroup.System,

                _ => NotificationGroup.Master,
            };
        }
    }
}