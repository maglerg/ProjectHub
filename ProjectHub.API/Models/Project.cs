using System.Security.Cryptography.X509Certificates;

namespace ProjectHub.API.Models
{
    public enum ProjectVisibility
    {
        Private,
        Public
    }
    public enum ProjectCategory
    {
        // Учебные
        Education,          // Учебный проект
        Coursework,         // Курсовая работа
        Diploma,           // Дипломный проект

        // IT и разработка
        WebDevelopment,    // Веб-разработка
        MobileDevelopment, // Мобильная разработка
        DesktopDevelopment,// Десктопное ПО
        GameDevelopment,   // Разработка игр
        DevOps,            // DevOps проекты
        DataScience,       // Data Science / AI
        Cybersecurity,     // Кибербезопасность

        // Бизнес
        Startup,           // Стартап
        Freelance,         // Фриланс-проект
        Commercial,        // Коммерческий проект

        // Творческие
        Design,            // Дизайн-проект
        ContentCreation,   // Создание контента

        // Другое
        Research,          // Исследовательский проект
        Personal,          // Личный проект
        Other              // Другое
    }
    public class Project
    {
        // Внутри проекта можно создавать задачи, перемещать их и обсуждать (комментировать).
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string PublicCode {  get; set; } // 9 символов
        public string Description { get; set; }
        public ProjectCategory Category { get; set; }
        public ProjectVisibility Visibility { get; set; }
        public DateTime Deadline { get; set; }
        // задачи проекта


    }
}
