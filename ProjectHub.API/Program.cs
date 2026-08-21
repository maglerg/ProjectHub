using ProjectHub.API.Services;
using Serilog;
using Serilog.Events;
var logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs", "log.txt");

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(logFilePath, rollingInterval: RollingInterval.Day)
    .CreateLogger();

// Очищаем логи при запуске
LogCleanupService.CleanLogFile(logFilePath);


var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder => builder
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Host.UseSerilog();
builder.Logging.ClearProviders();
builder.Logging.AddConsole();  
builder.Logging.AddDebug();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<ProjectsService>();  // Основной сервис
builder.Services.AddSingleton<CodeGeneratorService>(); // Сервис генерации кодов

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");

app.UseAuthorization();

app.MapControllers();

app.Run();
