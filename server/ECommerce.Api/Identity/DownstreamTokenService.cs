using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ECommerce.Api.Identity;

public sealed class DownstreamTokenService : IDisposable
{
    private readonly DownstreamTokenOptions _options;
    private readonly RSA _rsa;
    private readonly SigningCredentials _signingCredentials;

    public DownstreamTokenService(IOptions<DownstreamTokenOptions> options)
    {
        _options = options.Value;
        _rsa = RSA.Create();
        var privateKey = Convert.FromBase64String(_options.PrivateKey);
        _rsa.ImportPkcs8PrivateKey(privateKey, out var bytesRead);

        if (bytesRead != privateKey.Length)
        {
            _rsa.Dispose();
            throw new CryptographicException("The downstream private key contains trailing data.");
        }

        var signingKey = new RsaSecurityKey(_rsa) { KeyId = _options.KeyId };
        _signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.RsaSha256);
    }

    public string CreateToken(
        ClaimsPrincipal user,
        IEnumerable<string> permissions,
        IEnumerable<string>? downstreamRoles = null)
    {
        var subject = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(subject, out _))
        {
            throw new InvalidOperationException("An authenticated user ID is required for a downstream token.");
        }

        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(now).ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new("azp", "ecommerce-api")
        };

        var normalizedPermissions = permissions
            .Where(permission => !string.IsNullOrWhiteSpace(permission))
            .Select(permission => permission.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (normalizedPermissions.Length > 0)
        {
            claims.Add(new Claim("scope", string.Join(' ', normalizedPermissions)));
        }

        claims.AddRange(user.FindAll(ClaimTypes.Role)
            .Select(role => new Claim("role", role.Value)));

        if (downstreamRoles is not null)
        {
            claims.AddRange(downstreamRoles
                .Where(role => !string.IsNullOrWhiteSpace(role))
                .Select(role => role.Trim())
                .Distinct(StringComparer.Ordinal)
                .Select(role => new Claim("role", role)));
        }

        var token = new JwtSecurityToken(
            _options.Issuer,
            _options.Audience,
            claims,
            notBefore: now,
            expires: now.AddMinutes(_options.LifetimeMinutes),
            signingCredentials: _signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public void Dispose() => _rsa.Dispose();
}
