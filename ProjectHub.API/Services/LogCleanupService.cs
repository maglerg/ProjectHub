using Serilog;

namespace ProjectHub.API.Services
{
    public class LogCleanupService
    {
        public static void CleanLogFile(string logFilePath)
        {
            try
            {
                // Проверяем, существует ли файл
                if (File.Exists(logFilePath))
                {
                    // Создаем бэкап старых логов (опционально)
                    var backupPath = logFilePath + ".bak";
                    if (File.Exists(backupPath))
                    {
                        File.Delete(backupPath);
                    }
                    File.Move(logFilePath, backupPath);

                    Log.Information($"📦 Старые логи сохранены в: {backupPath}");
                }

                // Создаем новый файл с заголовком
                var directory = Path.GetDirectoryName(logFilePath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.WriteAllText(logFilePath,
                    $"===== НОВЫЙ ЗАПУСК СЕРВЕРА: {DateTime.Now:yyyy-MM-dd HH:mm:ss} ====={Environment.NewLine}");

                Log.Information("🧹 Файл логов очищен");
                Log.Information($"📁 Новый файл: {logFilePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Ошибка очистки логов: {ex.Message}");
            }
        }
    }
}