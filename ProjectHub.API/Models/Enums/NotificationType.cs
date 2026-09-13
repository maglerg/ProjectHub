namespace ProjectHub.API.Models.Enums
{
    public enum NotificationType
    {
        ApplicationReceived,  // Получена заявка
        ApplicationApproved,  // Заявка одобрена
        ApplicationRejected,  // Заявка отклонена
        ProjectInvitation,    // Приглашение в проект
        NewMember,            // Новый участник
        TaskAssigned,         // Назначена задача
        TaskCompleted,        // Задача завершена
        System,               // Системное
        FriendRequest,      //     
        FriendRequestAccepted,   
        FriendRequestRejected,
        FriendRemoved,
        RoleChanged,
        RemovedFromProject,  
        MemberRemoved,
        InvitationAccepted,       // ← Приглашение принято
        InvitationRejected,       // ← Приглашение отклонено
        NewMessage,
        NewVoting
    }

}
