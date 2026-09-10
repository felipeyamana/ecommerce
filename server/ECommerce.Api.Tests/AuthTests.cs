using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using ECommerce.Api.Contracts;
using ECommerce.Api.Data;
using ECommerce.Api.Identity;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class AuthTests : IAsyncLifetime
{
    private readonly string _databaseName = "ECommerceAuthTests_" + Guid.NewGuid().ToString("N");
    private readonly TestSigningKey _signingKey = TestSigningKey.Create();

    private string ConnectionString =>
        $"Server=(localdb)\\MSSQLLocalDB;Database={_databaseName};Trusted_Connection=True;TrustServerCertificate=True;Pooling=False";

    public async Task InitializeAsync()
    {
        await using var db = CreateDbContext();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        if (!_databaseName.StartsWith("ECommerceAuthTests_", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Refusing to delete a non-test database.");
        }

        await using var db = CreateDbContext();
        await db.Database.EnsureDeletedAsync();
    }

    [Fact]
    public async Task RegisterCreatesSessionAndLogoutClearsIt()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true
        });

        await SetAntiforgeryHeaderAsync(client);
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "shopper@example.com",
            password = "Password1",
            confirmPassword = "Password1"
        });
        Assert.Equal(HttpStatusCode.NoContent, register.StatusCode);

        await SetAntiforgeryHeaderAsync(client);
        var currentUser = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");
        Assert.Equal("shopper@example.com", currentUser!.Email);
        Assert.Empty(currentUser.Roles);

        var logout = await client.PostAsJsonAsync("/api/auth/logout", new { });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task AuthenticationMutationsRequireAntiforgeryToken()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true
        });

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "missing-token@example.com",
            password = "Password1",
            confirmPassword = "Password1"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MigrationMatchesTheCurrentIdentityModel()
    {
        await using var db = CreateDbContext();
        Assert.False(db.Database.HasPendingModelChanges());
        Assert.Single(await db.Database.GetAppliedMigrationsAsync());
    }

    [Fact]
    public async Task CartRequiresCookieAndForwardsAuthenticatedUser()
    {
        var cartClient = new RecordingCartApiClient();
        using var factory = CreateFactory(cartClient);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/cart")).StatusCode);

        await SetAntiforgeryHeaderAsync(client);
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "cart-shopper@example.com",
            password = "Password1",
            confirmPassword = "Password1"
        });
        register.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/cart");

        response.EnsureSuccessStatusCode();
        Assert.True(Guid.TryParse(cartClient.UserId, out _));
    }

    private ApplicationDbContext CreateDbContext() => new(
        new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(ConnectionString).Options);

    private WebApplicationFactory<Program> CreateFactory(ICartApiClient? cartApiClient = null) =>
        new WebApplicationFactory<Program>()
        .WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ProductsApi:BaseUrl"] = "https://example.invalid",
                    ["ProductsApi:ApiKey"] = "test-only",
                    ["DownstreamTokens:Issuer"] = "ecommerce-api",
                    ["DownstreamTokens:Audience"] = "products-api",
                    ["DownstreamTokens:LifetimeMinutes"] = "5",
                    ["DownstreamTokens:PrivateKey"] = _signingKey.PrivateKey,
                    ["DownstreamTokens:KeyId"] = "test-key-1"
                }));
            builder.ConfigureServices(services =>
            {
                services.AddDataProtection().UseEphemeralDataProtectionProvider();
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<ApplicationDbContext>();
                services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(ConnectionString));

                if (cartApiClient is not null)
                {
                    services.RemoveAll<ICartApiClient>();
                    services.AddSingleton(cartApiClient);
                }
            });
        });

    private sealed class RecordingCartApiClient : ICartApiClient
    {
        public string? UserId { get; private set; }

        public Task<CartApiResult> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken)
        {
            UserId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return Task.FromResult(EmptyCart());
        }

        public Task<CartApiResult> SetItemAsync(
            ClaimsPrincipal user,
            long productId,
            SetCartItemRequest request,
            CancellationToken cancellationToken) => Task.FromResult(EmptyCart());

        public Task<CartApiResult> RemoveItemAsync(
            ClaimsPrincipal user,
            long productId,
            Guid? version,
            CancellationToken cancellationToken) => Task.FromResult(EmptyCart());

        public Task<CartApiResult> ClearAsync(
            ClaimsPrincipal user,
            Guid? version,
            CancellationToken cancellationToken) => Task.FromResult(EmptyCart());

        private static CartApiResult EmptyCart() =>
            new(new CartResponse(Guid.Empty, [], 0, null, null), StatusCodes.Status200OK, null);
    }

    private sealed record TestSigningKey(string PrivateKey, string PublicKey)
    {
        public static TestSigningKey Create()
        {
            using var rsa = RSA.Create(2048);
            return new TestSigningKey(
                Convert.ToBase64String(rsa.ExportPkcs8PrivateKey()),
                Convert.ToBase64String(rsa.ExportSubjectPublicKeyInfo()));
        }
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
