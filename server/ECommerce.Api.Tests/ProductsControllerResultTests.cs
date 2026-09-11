using ECommerce.Api.Controllers;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class ProductsControllerResultTests
{
    [Fact]
    public async Task GetProducts_ReturnsSuccessfulPayloadWithoutResultWrapper()
    {
        var products = new PagedProductsResponse([], 1, 30, 0, 0);
        var client = new StubProductsApiClient
        {
            ProductsResult = DownstreamApiResult<PagedProductsResponse>.Success(
                products,
                StatusCodes.Status200OK)
        };
        var controller = new ProductsController(client);

        var response = await controller.GetProducts();

        var objectResult = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(StatusCodes.Status200OK, objectResult.StatusCode);
        Assert.Same(products, objectResult.Value);
    }

    [Fact]
    public async Task GetProduct_ReturnsExpectedDownstreamFailureWithoutThrowing()
    {
        var client = new StubProductsApiClient
        {
            ProductResult = DownstreamApiResult<ProductResponse>.Failure(
                StatusCodes.Status404NotFound,
                "Product 42 was not found.")
        };
        var controller = new ProductsController(client);

        var response = await controller.GetProduct(42, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response.Result);
        Assert.Equal(StatusCodes.Status404NotFound, objectResult.StatusCode);
    }

    private sealed class StubProductsApiClient : IProductsApiClient
    {
        public DownstreamApiResult<PagedProductsResponse> ProductsResult { get; init; } =
            DownstreamApiResult<PagedProductsResponse>.Success(
                new PagedProductsResponse([], 1, 30, 0, 0),
                StatusCodes.Status200OK);

        public DownstreamApiResult<ProductResponse> ProductResult { get; init; } =
            DownstreamApiResult<ProductResponse>.Failure(StatusCodes.Status404NotFound, "Not found.");

        public Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
            int page,
            int pageSize,
            string? search,
            CancellationToken cancellationToken) => Task.FromResult(ProductsResult);

        public Task<DownstreamApiResult<ProductResponse>> GetProductAsync(
            long id,
            CancellationToken cancellationToken) => Task.FromResult(ProductResult);

        public Task<DownstreamApiResult<IReadOnlyList<CategoryResponse>>> GetCategoriesAsync(
            CancellationToken cancellationToken) => Task.FromResult(
                DownstreamApiResult<IReadOnlyList<CategoryResponse>>.Success(
                    [],
                    StatusCodes.Status200OK));
    }
}
