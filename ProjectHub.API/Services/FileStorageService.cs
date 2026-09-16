namespace ProjectHub.API.Services
{
    public class FileStorageService
    {
        private readonly string _rootPath;

        public FileStorageService(IConfiguration configuration, IWebHostEnvironment env)
        {
            var configured = configuration["FileStorage:RootPath"] ?? "App_Data/uploads";
            _rootPath = Path.IsPathRooted(configured)
                ? configured
                : Path.Combine(env.ContentRootPath, configured);

            Directory.CreateDirectory(_rootPath);
        }

        /// <summary>Сохраняет поток в файл и возвращает уникальное имя на диске</summary>
        public async Task<string> SaveAsync(Stream stream, string extension)
        {
            var storedName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(_rootPath, storedName);

            using var fileStream = new FileStream(fullPath, FileMode.CreateNew);
            await stream.CopyToAsync(fileStream);

            return storedName;
        }

        public string GetFullPath(string storedFileName)
            => Path.Combine(_rootPath, storedFileName);

        public void Delete(string storedFileName)
        {
            var path = GetFullPath(storedFileName);
            if (File.Exists(path))
                File.Delete(path);
        }

        public Stream OpenRead(string storedFileName)
            => new FileStream(GetFullPath(storedFileName), FileMode.Open, FileAccess.Read);
    }
}