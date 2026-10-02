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
        var products = new PagedProductsResponse([], 1, 30, 0, 0, ProductFacetsResponse.Empty);
        var client = new StubProductsApiClient
        {
            ProductsResult = DownstreamApiResult<PagedProductsResponse>.Success(
                products,
                StatusCodes.Status200OK)
        };
        var controller = new ProductsController(client);

        var response = await controller.GetProducts(new GetProductsRequest());

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

    [Fact]
    public async Task GetProducts_ForwardsCatalogFiltersToProductsApi()
    {
        var client = new StubProductsApiClient();
        var controller = new ProductsController(client);

        await controller.GetProducts(new GetProductsRequest
        {
            Page = 2,
            PageSize = 12,
            Search = " headphones ",
            CategoryId = 1,
            SubCategoryId = 7,
            Brands = ["Acme", "SoundCo"],
            MinPrice = 25.50m,
            MaxPrice = 300m,
            MinRating = 4m,
            Sort = " PRICE-ASC "
        });

        var query = Assert.IsType<ProductCatalogQuery>(client.ProductsQuery);
        Assert.Equal(2, query.Page);
        Assert.Equal(12, query.PageSize);
        Assert.Equal("headphones", query.Search);
        Assert.Equal(1, query.CategoryId);
        Assert.Equal(7, query.SubCategoryId);
        Assert.Equal(["Acme", "SoundCo"], query.Brands);
        Assert.Equal(25.50m, query.MinPrice);
        Assert.Equal(300m, query.MaxPrice);
        Assert.Equal(4m, query.MinRating);
        Assert.Equal("price-asc", query.Sort);
    }

    private sealed class StubProductsApiClient : IProductsApiClient
    {
        public DownstreamApiResult<PagedProductsResponse> ProductsResult { get; init; } =
            DownstreamApiResult<PagedProductsResponse>.Success(
                new PagedProductsResponse([], 1, 30, 0, 0, ProductFacetsResponse.Empty),
                StatusCodes.Status200OK);

        public DownstreamApiResult<ProductResponse> ProductResult { get; init; } =
            DownstreamApiResult<ProductResponse>.Failure(StatusCodes.Status404NotFound, "Not found.");

        public ProductCatalogQuery? ProductsQuery { get; private set; }

        public Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
            ProductCatalogQuery query,
            CancellationToken cancellationToken)
        {
            ProductsQuery = query;
            return Task.FromResult(ProductsResult);
        }

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
