namespace ECommerce.Api.Products;

public interface IProductsApiClient
{
    Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
        ProductCatalogQuery query,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<ProductResponse>> GetProductAsync(
        long id,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<IReadOnlyList<CategoryResponse>>> GetCategoriesAsync(
        CancellationToken cancellationToken);
}
