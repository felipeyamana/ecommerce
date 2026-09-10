using System.Security.Cryptography;

namespace ECommerce.Api.Identity;

public sealed class DownstreamTokenOptions
{
    /// <summary>
    /// Configuration section containing the downstream token settings.
    /// </summary>
    public const string SectionName = "DownstreamTokens";

    /// <summary>
    /// Identifies ECommerce as the trusted service that issued the token.
    /// Products API must validate this value against its configured issuer.
    /// </summary>
    public required string Issuer { get; init; }

    /// <summary>
    /// Identifies the intended token recipient. Products API must reject tokens
    /// whose audience does not match this value.
    /// </summary>
    public required string Audience { get; init; }

    /// <summary>
    /// Controls how long a downstream token remains valid. A short lifetime limits
    /// the usefulness of a token if it is exposed; valid configuration is 1–10 minutes.
    /// </summary>
    public int LifetimeMinutes { get; init; } = 5;

    /// <summary>
    /// Base64-encoded PKCS#8 RSA private key used exclusively by ECommerce to sign
    /// downstream tokens. Store it outside tracked configuration in production.
    /// </summary>
    public required string PrivateKey { get; init; }

    /// <summary>
    /// Identifies the active signing key in each JWT header so Products API can select
    /// the corresponding public key and support safe key rotation.
    /// </summary>
    public required string KeyId { get; init; }

    public static bool IsValid(DownstreamTokenOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Issuer) ||
            string.IsNullOrWhiteSpace(options.Audience) ||
            string.IsNullOrWhiteSpace(options.PrivateKey) ||
            string.IsNullOrWhiteSpace(options.KeyId) ||
            options.LifetimeMinutes is < 1 or > 10)
        {
            return false;
        }

        try
        {
            var privateKey = Convert.FromBase64String(options.PrivateKey);
            using var rsa = RSA.Create();
            rsa.ImportPkcs8PrivateKey(privateKey, out var bytesRead);
            return bytesRead == privateKey.Length && rsa.KeySize >= 2048;
        }
        catch (Exception exception) when (exception is FormatException or CryptographicException)
        {
            return false;
        }
    }
}
