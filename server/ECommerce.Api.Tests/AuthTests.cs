using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using ECommerce.Api.Contracts;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ECommerce.Api.Tests;

// Reserve full-host tests for authentication and critical purchase flows.
[Trait("Category", "Integration")]
public sealed class AuthTests(AuthApiFixture fixture) : IClassFixture<AuthApiFixture>
{
    [Fact]
    public async Task RegisterCreatesSessionAndLogoutClearsIt()
    {
        using var client = fixture.CreateClient();
        await SetAntiforgeryHeaderAsync(client);
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "shopper@example.com",
            password = "Password1",
            confirmPassword = "Password1"
        });
        Assert.Equal(HttpStatusCode.NoContent, register.StatusCode);
        var user = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");
        Assert.Equal(AuthApiFixture.UserId, user!.Id);
        Assert.Equal("shopper@example.com", user.Email);
        Assert.Empty(user.Roles);

        await SetAntiforgeryHeaderAsync(client);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/auth/logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task LoginCreatesAuthenticatedSession()
    {
        using var client = fixture.CreateClient();
        await SetAntiforgeryHeaderAsync(client);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "shopper@example.com", password = "Password1", rememberMe = false
        });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var user = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");
        Assert.Equal(AuthApiFixture.UserId, user!.Id);
        Assert.Equal("shopper@example.com", user.Email);
    }

    [Fact]
    public async Task ProtectedEndpointsRequireAuthenticationAndMutationsRequireAntiforgery()
    {
        using var client = fixture.CreateClient();
        foreach (var path in new[]
        {
            "/api/auth/me",
            "/api/cart",
            "/api/favorites",
            $"/api/orders/{Guid.NewGuid():D}"
        })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "shopper@example.com", password = "Password1", confirmPassword = "Password1"
        })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "shopper@example.com", password = "Password1"
        })).StatusCode);

        await SetAntiforgeryHeaderAsync(client);
        (await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "shopper@example.com", password = "Password1"
        })).EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/favorites/42", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync("/api/favorites/42")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/orders", new
        {
            addressId = Guid.NewGuid(), cartVersion = Guid.NewGuid()
        })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync(
            $"/api/orders/{Guid.NewGuid():D}/checkout",
            null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/logout", new { })).StatusCode);
    }

    private static async Task SetAntiforgeryHeaderAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/auth/csrf");
        response.EnsureSuccessStatusCode();
        var cookie = response.Headers.GetValues("Set-Cookie")
            .Single(value => value.StartsWith("XSRF-TOKEN=", StringComparison.Ordinal));
        var value = cookie.Split(';', 2)[0]["XSRF-TOKEN=".Length..];
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", Uri.UnescapeDataString(value));
    }
}

public sealed class AuthApiFixture : IDisposable
{
    public static readonly Guid UserId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    private readonly WebApplicationFactory<Program> factory;

    public AuthApiFixture()
    {
        using var rsa = RSA.Create(2048);
        var key = Convert.ToBase64String(rsa.ExportPkcs8PrivateKey());
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureLogging(logging => logging.ClearProviders());
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ProductsApi:BaseUrl"] = "https://example.invalid",
                    ["ProductsApi:ApiKey"] = "test-only",
                    ["DownstreamTokens:Issuer"] = "ecommerce-api",
                    ["DownstreamTokens:Audience"] = "products-api",
                    ["DownstreamTokens:LifetimeMinutes"] = "5",
                    ["DownstreamTokens:PrivateKey"] = key,
                    ["DownstreamTokens:KeyId"] = "test-key-1"
                }));
            builder.ConfigureServices(services =>
            {
                services.AddDataProtection().UseEphemeralDataProtectionProvider();
                services.RemoveAll<IProductsAuthApiClient>();
                services.AddSingleton<IProductsAuthApiClient>(new StubAuthClient());
            });
        });
    }

    public HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"), HandleCookies = true
    });
    public void Dispose() => factory.Dispose();

    private sealed class StubAuthClient : IProductsAuthApiClient
    {
        public Task<ProductsAuthResult> RegisterAsync(RegisterRequest request, string clientIp, CancellationToken cancellationToken) =>
            Task.FromResult(ProductsAuthResult.Success(new ProductsAuthUser(UserId, request.Email, []), 200));
        public Task<ProductsAuthResult> LoginAsync(LoginRequest request, string clientIp, CancellationToken cancellationToken) =>
            Task.FromResult(ProductsAuthResult.Success(new ProductsAuthUser(UserId, request.Email, []), 200));
    }
}
