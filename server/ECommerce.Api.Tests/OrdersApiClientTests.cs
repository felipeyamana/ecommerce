using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using ECommerce.Api.Identity;
using ECommerce.Api.Products;
using Microsoft.Extensions.Options;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class OrdersApiClientTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    private static readonly Guid AddressId = Guid.Parse("11111111-2222-3333-4444-555555555555");
    private static readonly Guid CartVersion = Guid.Parse("66666666-7777-8888-9999-aaaaaaaaaaaa");
    private static readonly Guid OrderId = Guid.Parse("bbbbbbbb-cccc-dddd-eeee-ffffffffffff");

    [Fact]
    public async Task ListsCurrentCustomerOrdersWithReadOnlyToken()
    {
        var handler = new RecordingHandler(_ => JsonResponse(
            HttpStatusCode.OK,
            new PagedOrdersResponse(
                [new OrderSummaryResponse(OrderId, "Confirmed", "USD", 25m, 1, DateTime.UtcNow)],
                2,
                10,
                11,
                2)));
        using var tokenService = CreateTokenService();
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://products.example")
        };
        var client = new OrdersApiClient(httpClient, tokenService);

        var result = await client.ListAsync(CreateUser(), 2, 10, default);

        Assert.True(result.IsSuccess);
        Assert.Equal(11, result.Value!.TotalCount);
        var request = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Get, request.Method);
        Assert.Equal("/api/orders", request.Path);
        Assert.Equal("?page=2&pageSize=10", request.Query);
        AssertToken(request.BearerToken, "orders:read");
    }

    [Fact]
    public async Task ProxiesPurchaseFlowWithTheExpectedPathsAndLeastPrivilegeTokens()
    {
        var handler = new RecordingHandler(request =>
        {
            var path = request.RequestUri!.AbsolutePath;
            return path.EndsWith("/checkout", StringComparison.Ordinal)
                ? JsonResponse(HttpStatusCode.OK, CheckoutSession())
                : JsonResponse(
                    request.Method == HttpMethod.Post
                        ? HttpStatusCode.Created
                        : HttpStatusCode.OK,
                    Order());
        });
        using var tokenService = CreateTokenService();
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://products.example")
        };
        var client = new OrdersApiClient(httpClient, tokenService);
        var user = CreateUser();

        var created = await client.CreateAsync(
            user,
            new CreateOrderRequest(AddressId, CartVersion),
            default);
        var loaded = await client.GetAsync(user, OrderId, default);
        var checkout = await client.CreateCheckoutSessionAsync(user, OrderId, default);

        Assert.Equal(HttpStatusCode.Created, (HttpStatusCode)created.StatusCode);
        Assert.Equal(OrderId, created.Value!.Id);
        Assert.Equal(OrderId, loaded.Value!.Id);
        Assert.Equal("cs_test_secret_value", checkout.Value!.ClientSecret);

        Assert.Collection(
            handler.Requests,
            request =>
            {
                Assert.Equal(HttpMethod.Post, request.Method);
                Assert.Equal("/api/orders", request.Path);
                AssertToken(request.BearerToken, "orders:write");
                using var body = JsonDocument.Parse(request.Body!);
                Assert.Equal(AddressId, body.RootElement.GetProperty("addressId").GetGuid());
                Assert.Equal(CartVersion, body.RootElement.GetProperty("cartVersion").GetGuid());
            },
            request =>
            {
                Assert.Equal(HttpMethod.Get, request.Method);
                Assert.Equal($"/api/orders/{OrderId:D}", request.Path);
                AssertToken(request.BearerToken, "orders:read");
                Assert.Null(request.Body);
            },
            request =>
            {
                Assert.Equal(HttpMethod.Post, request.Method);
                Assert.Equal($"/api/orders/{OrderId:D}/checkout", request.Path);
                AssertToken(request.BearerToken, "orders:write");
                Assert.Null(request.Body);
            });
    }

    [Fact]
    public async Task PreservesDownstreamCheckoutErrors()
    {
        var handler = new RecordingHandler(_ => JsonResponse(
            HttpStatusCode.Conflict,
            new { message = "Checkout is complete or expired." }));
        using var tokenService = CreateTokenService();
        using var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://products.example")
        };
        var client = new OrdersApiClient(httpClient, tokenService);

        var result = await client.CreateCheckoutSessionAsync(
            CreateUser(),
            OrderId,
            default);

        Assert.False(result.IsSuccess);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("Checkout is complete or expired.", result.Error);
    }

    private static ClaimsPrincipal CreateUser() =>
        new(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, UserId.ToString()),
            new Claim(ClaimTypes.Role, "Customer")
        ], "Test"));

    private static DownstreamTokenService CreateTokenService()
    {
        using var rsa = RSA.Create(2048);
        return new DownstreamTokenService(Options.Create(new DownstreamTokenOptions
        {
            Issuer = "ecommerce-api",
            Audience = "products-api",
            LifetimeMinutes = 5,
            PrivateKey = Convert.ToBase64String(rsa.ExportPkcs8PrivateKey()),
            KeyId = "test-key-1"
        }));
    }

    private static void AssertToken(string token, string expectedScope)
    {
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal(UserId.ToString(), jwt.Subject);
        Assert.Equal(expectedScope, jwt.Claims.Single(claim => claim.Type == "scope").Value);
        Assert.Contains(jwt.Claims, claim => claim.Type == "role" && claim.Value == "OrderUser");
    }

    private static OrderDetailResponse Order() =>
        new(
            OrderId,
            "Pending",
            "shopper@example.com",
            new OrderShippingAddressResponse(
                "Shopper",
                null,
                null,
                "1 Main Street",
                null,
                "Example City",
                "CA",
                "90001",
                "US"),
            "USD",
            25m,
            0m,
            0m,
            0m,
            25m,
            DateTime.UtcNow,
            DateTime.UtcNow,
            [new OrderItemResponse(1, "Product", null, 1, 25m, 0m, 25m)],
            "Pending",
            null);

    private static CheckoutSessionResponse CheckoutSession() =>
        new(OrderId, "cs_test", "cs_test_secret_value");

    private static HttpResponseMessage JsonResponse<T>(HttpStatusCode statusCode, T value) =>
        new(statusCode) { Content = JsonContent.Create(value) };

    private sealed class RecordingHandler(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        public List<RecordedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(new RecordedRequest(
                request.Method,
                request.RequestUri!.AbsolutePath,
                request.RequestUri.Query,
                request.Headers.Authorization!.Parameter!,
                request.Content is null
                    ? null
                    : await request.Content.ReadAsStringAsync(cancellationToken)));

            return responseFactory(request);
        }
    }

    private sealed record RecordedRequest(
        HttpMethod Method,
        string Path,
        string Query,
        string BearerToken,
        string? Body);
}
