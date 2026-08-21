// Services/CodeGeneratorService.cs
using System.Text;

namespace ProjectHub.API.Services
{
    public class CodeGeneratorService
    {
        private readonly ILogger<CodeGeneratorService> _logger;
        private readonly Random _random = new();

        // Используем символы, которые легко читаются (исключаем 0, O, 1, I, 2, Z, 5, S, 8, B)
        private const string Chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        private const int CodeLength = 9;

        public CodeGeneratorService(ILogger<CodeGeneratorService> logger)
        {
            _logger = logger;
        }

        public string GenerateRawCode()
        {
            var result = new StringBuilder(CodeLength);
            for (int i = 0; i < CodeLength; i++)
            {
                result.Append(Chars[_random.Next(Chars.Length)]);
            }
            return result.ToString();
        }

        public string GenerateFormattedCode()
        {
            var rawCode = GenerateRawCode();
            return FormatCode(rawCode);
        }

        private string FormatCode(string code)
        {
            if (code.Length != 9) return code;
            return $"{code[..3]}-{code.Substring(3, 3)}-{code.Substring(6, 3)}";
        }
    }
}
