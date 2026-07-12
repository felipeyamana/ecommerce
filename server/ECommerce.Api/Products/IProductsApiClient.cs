namespace ECommerce.Api.Products;

public interface IProductsApiClient
{
    Task<PagedProductsResponse> GetProductsAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<ProductResponse?> GetProductAsync(
        long id,
        CancellationToken cancellationToken);
}
