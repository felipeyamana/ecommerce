using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using ECommerce.Api.Contracts;
using ECommerce.Api.Identity;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class AuthTests
{
    private readonly TestSigningKey _signingKey = TestSigningKey.Create();

    [Fact]
    public async Task RegisterCreatesSessionAndLogoutClearsIt()
    {
        var authClient = new RecordingProductsAuthApiClient();
        using var factory = CreateFactory(authClient);
        using var client = CreateClient(factory);

        await SetAntiforgeryHeaderAsync(client);
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "shopper@example.com",
            password = "Password1",
            confirmPassword = "Password1"
        });

        Assert.Equal(HttpStatusCode.NoContent, register.StatusCode);
        Assert.Equal("shopper@example.com", authClient.RegisterRequest!.Email);

        await SetAntiforgeryHeaderAsync(client);
        var currentUser = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");
        Assert.Equal(authClient.User.Id, currentUser!.Id);
        Assert.Equal("shopper@example.com", currentUser.Email);
        Assert.Empty(currentUser.Roles);

        var logout = await client.PostAsJsonAsync("/api/auth/logout", new { });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Theory]
    [InlineData("ecommerceuser")]
    [InlineData("ECOMMERCEUSER1")]
    [InlineData("EcommerceUser")]
    [InlineData("Shop1")]
    public async Task RegisterRejectsPasswordsThatDoNotMeetProductsApiRequirements(string password)
    {
        var authClient = new RecordingProductsAuthApiClient();
        using var factory = CreateFactory(authClient);
        using var client = CreateClient(factory);

        await SetAntiforgeryHeaderAsync(client);
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "shopper@example.com",
            password,
            confirmPassword = password
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(authClient.RegisterRequest);
    }

    [Fact]
    public async Task LoginFailureFromProductsApiIsForwarded()
    {
        var authClient = new RecordingProductsAuthApiClient
        {
            LoginResult = ProductsAuthResult.Failure(
                StatusCodes.Status401Unauthorized,
                JsonSerializer.SerializeToElement(new { message = "Invalid email or password." }))
        };
        using var factory = CreateFactory(authClient);
        using var client = CreateClient(factory);

        await SetAntiforgeryHeaderAsync(client);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "shopper@example.com",
            password = "wrong",
            rememberMe = false
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("shopper@example.com", authClient.LoginRequest!.Email);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task AuthenticationMutationsRequireAntiforgeryToken()
    {
        using var factory = CreateFactory(new RecordingProductsAuthApiClient());
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "missing-token@example.com",
            password = "Password1",
            confirmPassword = "Password1"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CartRequiresCookieAndForwardsAuthenticatedUser()
    {
        var authClient = new RecordingProductsAuthApiClient();
        var cartClient = new RecordingCartApiClient();
        using var factory = CreateFactory(authClient, cartClient);
        using var client = CreateClient(factory);

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
        Assert.Equal(authClient.User.Id.ToString(), cartClient.UserId);
    }

    private WebApplicationFactory<Program> CreateFactory(
        IProductsAuthApiClient authClient,
        ICartApiClient? cartApiClient = null) =>
        new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
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
                        ["DownstreamTokens:PrivateKey"] = _signingKey.PrivateKey,
                        ["DownstreamTokens:KeyId"] = "test-key-1"
                    }));
                builder.ConfigureServices(services =>
                {
                    services.AddDataProtection().UseEphemeralDataProtectionProvider();
                    services.RemoveAll<IProductsAuthApiClient>();
                    services.AddSingleton(authClient);

                    if (cartApiClient is not null)
                    {
                        services.RemoveAll<ICartApiClient>();
                        services.AddSingleton(cartApiClient);
                    }
                });
            });

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true
        });

    private sealed class RecordingProductsAuthApiClient : IProductsAuthApiClient
    {
        public ProductsAuthUser User { get; } =
            new(Guid.NewGuid(), "shopper@example.com", []);

        public RegisterRequest? RegisterRequest { get; private set; }
        public LoginRequest? LoginRequest { get; private set; }

        public ProductsAuthResult? RegisterResult { get; init; }
        public ProductsAuthResult? LoginResult { get; init; }

        public Task<ProductsAuthResult> RegisterAsync(
            RegisterRequest request,
            string clientIp,
            CancellationToken cancellationToken)
        {
            RegisterRequest = request;
            var user = User with { Email = request.Email };
            return Task.FromResult(
                RegisterResult ?? ProductsAuthResult.Success(user, StatusCodes.Status200OK));
        }

        public Task<ProductsAuthResult> LoginAsync(
            LoginRequest request,
            string clientIp,
            CancellationToken cancellationToken)
        {
            LoginRequest = request;
            var user = User with { Email = request.Email };
            return Task.FromResult(
                LoginResult ?? ProductsAuthResult.Success(user, StatusCodes.Status200OK));
        }
    }

    private sealed class RecordingCartApiClient : ICartApiClient
    {
        public string? UserId { get; private set; }

        public Task<DownstreamApiResult<CartResponse>> GetAsync(
            ClaimsPrincipal user,
            CancellationToken cancellationToken)
        {
            UserId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return Task.FromResult(EmptyCart());
        }

        public Task<DownstreamApiResult<CartResponse>> SetItemAsync(
            ClaimsPrincipal user,
            long productId,
            SetCartItemRequest request,
            CancellationToken cancellationToken) => Task.FromResult(EmptyCart());

        public Task<DownstreamApiResult<CartResponse>> RemoveItemAsync(
            ClaimsPrincipal user,
            long productId,
            Guid? version,
            CancellationToken cancellationToken) => Task.FromResult(EmptyCart());

        public Task<DownstreamApiResult<CartResponse>> ClearAsync(
            ClaimsPrincipal user,
            Guid? version,
            CancellationToken cancellationToken) => Task.FromResult(EmptyCart());

        private static DownstreamApiResult<CartResponse> EmptyCart() =>
            DownstreamApiResult<CartResponse>.Success(
                new CartResponse(Guid.Empty, [], 0, null, null),
                StatusCodes.Status200OK);
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
