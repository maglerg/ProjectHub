// Services/Logging/LogCleanupService.cs
using Serilog;

namespace ProjectHub.API.Services.Logging
{
    /// <summary>
    /// Сервис для управления лог-файлами
    /// </summary>
    public class LogCleanupService
    {
        private readonly string _logFilePath;
        private readonly int _maxBackupFiles;

        public LogCleanupService(string logFilePath, int maxBackupFiles = 5)
        {
            _logFilePath = logFilePath;
            _maxBackupFiles = maxBackupFiles;
        }

        /// <summary>
        /// Очищает и подготавливает лог-файл к работе
        /// </summary>
        public void CleanLogFile()
        {
            try
            {
                Log.Information($"🧹 Начинаем очистку логов: {_logFilePath}");

                // 1. Создаём папку, если её нет
                var directory = Path.GetDirectoryName(_logFilePath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                    Log.Information($"📁 Создана папка: {directory}");
                }

                // 2. Создаём бэкап старого файла
                if (File.Exists(_logFilePath))
                {
                    var backupPath = GetBackupPath();
                    if (File.Exists(backupPath))
                    {
                        File.Delete(backupPath);
                    }
                    File.Move(_logFilePath, backupPath);
                    Log.Information($"📦 Старые логи сохранены в: {backupPath}");
                }

                // 3. Создаём новый файл с заголовком
                var header = $"===== НОВЫЙ ЗАПУСК СЕРВЕРА: {DateTime.Now:yyyy-MM-dd HH:mm:ss} ====={Environment.NewLine}";
                File.WriteAllText(_logFilePath, header);

                Log.Information("🧹 Файл логов очищен");
                Log.Information($"📁 Новый файл: {_logFilePath}");
            }
            catch (Exception ex)
            {
                Log.Error($"❌ Ошибка очистки логов: {ex.Message}");
                Console.WriteLine($"❌ Ошибка очистки логов: {ex.Message}");
            }
        }

        /// <summary>
        /// Генерирует путь для бэкапа с датой
        /// </summary>
        private string GetBackupPath()
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            return $"{_logFilePath}.backup-{timestamp}";
        }

        /// <summary>
        /// Очищает старые бэкапы (оставляет только последние N)
        /// </summary>
        public void CleanOldBackups()
        {
            try
            {
                var directory = Path.GetDirectoryName(_logFilePath);
                if (!Directory.Exists(directory)) return;

                var pattern = Path.GetFileName(_logFilePath) + ".backup-*";
                var files = Directory.GetFiles(directory, pattern)
                    .OrderByDescending(f => f)
                    .Skip(_maxBackupFiles)
                    .ToList();

                foreach (var file in files)
                {
                    File.Delete(file);
                    Log.Information($"Удалён старый бэкап: {file}");
                }
            }
            catch (Exception ex)
            {
                Log.Warning($"Не удалось очистить старые бэкапы: {ex.Message}");
            }
        }
    }
}