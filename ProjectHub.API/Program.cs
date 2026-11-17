// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using ProjectHub.API.Data;
using ProjectHub.API.Hubs;
using ProjectHub.API.Models;
using ProjectHub.API.Services;
using Serilog;
using Serilog.Events;
using System.Text;

// В контейнере основной поток логов направляется в stdout (docker logs).
// Файловый лог оставлен как дополнительный локальный источник.
var logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs", "log-.txt");
var logDirectory = Path.GetDirectoryName(logFilePath);

if (!string.IsNullOrWhiteSpace(logDirectory))
{
    Directory.CreateDirectory(logDirectory);
}

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        logFilePath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        fileSizeLimitBytes: 10 * 1024 * 1024,
        rollOnFileSizeLimit: true)
    .CreateLogger();

try
{
    Log.Information("=== ProjectHub API starting ===");

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    // В Docker frontend обращается к API через Nginx по тому же origin.
    // Эти origins нужны для локальной разработки, когда React и API запущены отдельно.
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>();

    if (allowedOrigins is null || allowedOrigins.Length == 0)
    {
        allowedOrigins =
        [
            "http://localhost:3000",
            "https://localhost:3000"
        ];
    }

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowReactApp", policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
    });

    // Database
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "ConnectionStrings:DefaultConnection is not configured.");
    }

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Введите JWT токен: Bearer {токен}"
        });

        options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", document)] = []
        });
    });

    // Application services
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<ITokenService, TokenService>();
    builder.Services.AddScoped<CodeGeneratorService>();
    builder.Services.AddScoped<ProjectsService>();
    builder.Services.AddScoped<ApplicationService>();
    builder.Services.AddScoped<NotificationService>();
    builder.Services.AddScoped<FriendService>();
    builder.Services.AddScoped<FriendRequestService>();
    builder.Services.AddScoped<InvitationService>();
    builder.Services.AddScoped<ChatService>();
    builder.Services.AddScoped<VotingsService>();
    builder.Services.AddScoped<TaskService>();
    builder.Services.AddSingleton<FileStorageService>();
    builder.Services.AddScoped<ActivityService>();
    builder.Services.AddScoped<ProjectHistoryService>();
    builder.Services.AddScoped<NoteService>();
    builder.Services.AddScoped<ProjectTagsService>();
    builder.Services.AddScoped<IPresenceService, PresenceService>();

    builder.Services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = builder.Environment.IsDevelopment();
        options.KeepAliveInterval = TimeSpan.FromSeconds(15);
        options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    });

    builder.Services.AddSingleton<PresenceTracker>();
    builder.Services.AddHostedService<DeadlineNotificationWorker>();

    // JWT secret обязателен: никаких небезопасных значений по умолчанию.
    var jwtSecret = builder.Configuration["Jwt:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
    {
        throw new InvalidOperationException(
            "Jwt:Secret must be configured and contain at least 32 bytes.");
    }

    var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = true;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // SignalR передаёт JWT в query string при WebSocket-подключении.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var requestPath = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    requestPath.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

    builder.Services.AddAuthorization();

    var app = builder.Build();

    // Миграции выполняются при старте. Если БД недоступна или миграция не прошла,
    // контейнер должен завершиться с ошибкой, а не запускать неработающий API.
    await using (var scope = app.Services.CreateAsyncScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
        Log.Information("Database connection and migrations completed successfully.");
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    // TLS завершается на внешнем reverse proxy (Caddy/Nginx).
    // Внутри Docker-сети Nginx обращается к Kestrel по HTTP.
    app.UseCors("AllowReactApp");

    var uploadsPath = Path.Combine(
        app.Environment.ContentRootPath,
        "App_Data",
        "uploads");

    Directory.CreateDirectory(uploadsPath);

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads",
        OnPrepareResponse = context =>
        {
            context.Context.Response.Headers["Cache-Control"] = "public,max-age=604800";
        }
    });

    app.UseStaticFiles();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<ChatHub>("/hubs/chat");

    Log.Information("ProjectHub API started. Environment: {Environment}", app.Environment.EnvironmentName);
    await app.RunAsync();
}
catch (Exception exception)
{
    Log.Fatal(exception, "ProjectHub API terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
