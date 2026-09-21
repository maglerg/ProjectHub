namespace ProjectHub.API.Models.Enums
{
    public enum NoteFilter
    {
        All = 0,       // все мои заметки
        Free = 1,      // только свободные (без проекта)
        Project = 2    // только заметки конкретного проекта
    }
}