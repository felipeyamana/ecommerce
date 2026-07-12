namespace ECommerce.Api.Products;

public sealed record ProductResponse(
    long Id,
    string Name,
    string? Brand,
    string? Description,
    int CategoryId,
    string CategoryName,
    int? SubCategoryId,
    string? SubCategoryName,
    string? ExternalProductId,
    decimal? AverageRating,
    int? TotalRatings,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    decimal? CurrentPrice,
    decimal? ListPrice,
    string? PriceCurrencyCode);

public sealed record PagedProductsResponse(
    IReadOnlyList<ProductResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount,
    int TotalPages);

internal sealed record ProductsApiTokenRequest(
    string Subject,
    IReadOnlyCollection<string> Roles);

internal sealed record ProductsApiTokenResponse(
    string AccessToken,
    string TokenType,
    DateTime ExpiresAtUtc);
