using System.Net;
using System.Security.Cryptography;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class ProductsEndpointValidationTests
{
    [Fact]
    public async Task GetProducts_InvalidQueryReturnsBadRequestWithoutCallingProductsApi()
    {
        var productsClient = new RecordingProductsApiClient();
        using var factory = CreateFactory(productsClient);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        using var response = await client.GetAsync(
            "/api/products?page=0&pageSize=31&minPrice=20&maxPrice=10&sort=oldest");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(productsClient.WasCalled);
    }

    private static WebApplicationFactory<Program> CreateFactory(IProductsApiClient productsClient)
    {
        using var rsa = RSA.Create(2048);
        var privateKey = Convert.ToBase64String(rsa.ExportPkcs8PrivateKey());

        return new WebApplicationFactory<Program>()
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
                        ["DownstreamTokens:PrivateKey"] = privateKey,
                        ["DownstreamTokens:KeyId"] = "test-key-1"
                    }));
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IProductsApiClient>();
                    services.AddSingleton(productsClient);
                });
            });
    }

    private sealed class RecordingProductsApiClient : IProductsApiClient
    {
        public bool WasCalled { get; private set; }

        public Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
            ProductCatalogQuery query,
            CancellationToken cancellationToken)
        {
            WasCalled = true;
            return Task.FromResult(DownstreamApiResult<PagedProductsResponse>.Success(
                new PagedProductsResponse([], 1, 30, 0, 0, ProductFacetsResponse.Empty),
                StatusCodes.Status200OK));
        }

        public Task<DownstreamApiResult<ProductResponse>> GetProductAsync(
            long id,
            CancellationToken cancellationToken) => throw new NotSupportedException();

        public Task<DownstreamApiResult<IReadOnlyList<CategoryResponse>>> GetCategoriesAsync(
            CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
