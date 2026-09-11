namespace ECommerce.Api.Products;

public interface IProductsApiClient
{
    Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<ProductResponse>> GetProductAsync(
        long id,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<IReadOnlyList<CategoryResponse>>> GetCategoriesAsync(
        CancellationToken cancellationToken);
}
