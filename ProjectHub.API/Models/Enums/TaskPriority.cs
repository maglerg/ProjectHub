namespace ProjectHub.API.Models.Enums
{
    public enum TaskPriority
    {
        None = 0,      // ⚪ без приоритета (по умолчанию)
        Low = 1,       // 🔵 низкий
        Medium = 2,    // 🟡 средний
        High = 3,      // 🟠 высокий
        Critical = 4   // 🔴 критический (блокер)
    }
}