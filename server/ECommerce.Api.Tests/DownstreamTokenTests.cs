using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using ECommerce.Api.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class DownstreamTokenTests
{
    [Fact]
    public void SymmetricKeyMaterialIsRejected()
    {
        var options = new DownstreamTokenOptions
        {
            Issuer = "ecommerce-api",
            Audience = "products-api",
            LifetimeMinutes = 5,
            PrivateKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)),
            KeyId = "invalid-key"
        };

        Assert.False(DownstreamTokenOptions.IsValid(options));
    }

    [Fact]
    public void TokenUsesRsaPrivateKeyAndCanBeValidatedWithPublicKeyOnly()
    {
        using var signingRsa = RSA.Create(2048);
        var options = Options.Create(new DownstreamTokenOptions
        {
            Issuer = "ecommerce-api",
            Audience = "products-api",
            LifetimeMinutes = 5,
            PrivateKey = Convert.ToBase64String(signingRsa.ExportPkcs8PrivateKey()),
            KeyId = "test-key-1"
        });
        var userId = Guid.NewGuid();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, "Customer")
        ], "Test"));

        using var tokenService = new DownstreamTokenService(options);
        var encoded = tokenService.CreateToken(
            principal,
            ["cart:read", "cart:write"],
            ["CartUser"]);

        using var validationRsa = RSA.Create();
        validationRsa.ImportSubjectPublicKeyInfo(signingRsa.ExportSubjectPublicKeyInfo(), out _);
        var parameters = new TokenValidationParameters
        {
            ValidIssuer = "ecommerce-api",
            ValidAudience = "products-api",
            IssuerSigningKey = new RsaSecurityKey(validationRsa) { KeyId = "test-key-1" },
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        var validated = new JwtSecurityTokenHandler().ValidateToken(encoded, parameters, out var token);

        var jwt = Assert.IsType<JwtSecurityToken>(token);
        Assert.Equal(SecurityAlgorithms.RsaSha256, jwt.Header.Alg);
        Assert.Equal("test-key-1", jwt.Header.Kid);
        Assert.Equal(userId.ToString(), validated.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal("cart:read cart:write", validated.FindFirstValue("scope"));
        Assert.True(validated.IsInRole("Customer"));
        Assert.True(validated.IsInRole("CartUser"));
    }
}
