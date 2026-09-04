namespace ProjectHub.API.Models.Enums
{
    public enum UserProjectStatus
    {
        NotJoined,      // Не присоединился
        Pending,        // Заявка ожидает
        Member,         // Уже участник
        Owner,          // Владелец
        Admin           // Админ
    }
}
