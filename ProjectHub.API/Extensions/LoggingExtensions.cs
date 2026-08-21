// Extensions/LoggingExtensions.cs
using ProjectHub.API.Services.Logging;

namespace ProjectHub.API.Extensions
{
    public static class LoggingExtensions
    {
        public static WebApplicationBuilder AddLogging(this WebApplicationBuilder builder)
        {
            var logFilePath = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "logs",
                "log.txt"
            );

            // Создаём папку ДО создания сервиса
            var logDirectory = Path.GetDirectoryName(logFilePath);
            if (!Directory.Exists(logDirectory))
            {
                Directory.CreateDirectory(logDirectory);
            }

            /*// Создаём сервис для работы с логами
            var logCleanupService = new LogCleanupService(logFilePath);

            // Очищаем логи при запуске
            logCleanupService.CleanLogFile();
            logCleanupService.CleanOldBackups();*/

            return builder;
        }
    }
}