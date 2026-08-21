// Program.cs
using ProjectHub.API.Services;
using ProjectHub.API.Services.Logging;
using ProjectHub.API.Data;
using ProjectHub.API.Extensions;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;

// 1. Настройка логгера
var logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs", "log.txt");

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(logFilePath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        fileSizeLimitBytes: 10485760,
        rollOnFileSizeLimit: true)
    .CreateLogger();

Log.Information("🚀 === СЕРВЕР ЗАПУСКАЕТСЯ ===");

// 2. ✅ Используем сервис для очистки логов
var logCleanupService = new LogCleanupService(logFilePath);
logCleanupService.CleanLogFile();
logCleanupService.CleanOldBackups();

Log.Information("✅ Лог-файл готов к работе");

// 3. Сборка приложения
var builder = WebApplication.CreateBuilder(args);

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder => builder
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// Entity Framework
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Host.UseSerilog();
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Регистрируем сервисы
builder.Services.AddScoped<CodeGeneratorService>();
builder.Services.AddScoped<ProjectsService>();

var app = builder.Build();

// Проверка БД
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        dbContext.Database.EnsureCreated();
        Log.Information("База данных подключена и готова к работе");
    }
    catch (Exception ex)
    {
        Log.Error($"Ошибка подключения к БД: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthorization();
app.MapControllers();

Log.Information("🚀 Сервер запущен на https://localhost:7000");
app.Run();