using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;

namespace PaymentService.Microservice.Security
{
    public class EncryptionService
    {
        private readonly ILogger<EncryptionService> _logger;
        private readonly string _encryptionKey;

        public EncryptionService(ILogger<EncryptionService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _encryptionKey = configuration["Encryption:Key"] ?? "your-32-character-encryption-key-here";
        }

        public string Encrypt(string plainText)
        {
            try
            {
                using var aes = Aes.Create();
                aes.Key = Encoding.UTF8.GetBytes(_encryptionKey);
                aes.GenerateIV();

                using var encryptor = aes.CreateEncryptor();
                using var msEncrypt = new MemoryStream();
                using var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write);
                using var swEncrypt = new StreamWriter(csEncrypt);

                swEncrypt.Write(plainText);
                swEncrypt.Close();

                var encrypted = msEncrypt.ToArray();
                var result = new byte[aes.IV.Length + encrypted.Length];
                Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
                Buffer.BlockCopy(encrypted, 0, result, aes.IV.Length, encrypted.Length);

                return Convert.ToBase64String(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to encrypt data");
                throw;
            }
        }

        public string Decrypt(string cipherText)
        {
            try
            {
                var fullCipher = Convert.FromBase64String(cipherText);

                using var aes = Aes.Create();
                aes.Key = Encoding.UTF8.GetBytes(_encryptionKey);

                var iv = new byte[aes.IV.Length];
                var cipher = new byte[fullCipher.Length - iv.Length];

                Buffer.BlockCopy(fullCipher, 0, iv, 0, iv.Length);
                Buffer.BlockCopy(fullCipher, iv.Length, cipher, 0, cipher.Length);

                aes.IV = iv;

                using var decryptor = aes.CreateDecryptor();
                using var msDecrypt = new MemoryStream(cipher);
                using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
                using var srDecrypt = new StreamReader(csDecrypt);

                return srDecrypt.ReadToEnd();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to decrypt data");
                throw;
            }
        }

        public string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            var hashedInput = HashPassword(password);
            return hashedInput == hashedPassword;
        }

        public string GenerateSecureToken(int length = 32)
        {
            var randomBytes = new byte[length];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }
    }
}
