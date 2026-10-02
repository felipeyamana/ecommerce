using System.ComponentModel.DataAnnotations;

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
    int TotalPages,
    ProductFacetsResponse Facets);

public sealed record ProductFacetsResponse(
    decimal? MinPrice,
    decimal? MaxPrice,
    IReadOnlyList<ProductBrandFacetResponse> Brands,
    IReadOnlyList<ProductRatingFacetResponse> Ratings)
{
    public static ProductFacetsResponse Empty { get; } = new(null, null, [], []);
}

public sealed record ProductBrandFacetResponse(string Brand, int Count);

public sealed record ProductRatingFacetResponse(decimal MinRating, int Count);

public sealed class GetProductsRequest : IValidatableObject
{
    private const int MaxSearchLength = 200;
    private const int MaxBrands = 20;
    private static readonly HashSet<string> SupportedSorts =
    [
        "name-asc",
        "name-desc",
        "price-asc",
        "price-desc",
        "rating-desc",
        "newest"
    ];

    [Range(1, int.MaxValue, ErrorMessage = "Page must be at least 1.")]
    public int Page { get; init; } = 1;

    [Range(1, 30, ErrorMessage = "Page size must be between 1 and 30.")]
    public int PageSize { get; init; } = 30;

    public string? Search { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "Category ID must be positive.")]
    public int? CategoryId { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "Subcategory ID must be positive.")]
    public int? SubCategoryId { get; init; }

    public string[]? Brands { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99", ErrorMessage = "Minimum price is outside the supported range.")]
    public decimal? MinPrice { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99", ErrorMessage = "Maximum price is outside the supported range.")]
    public decimal? MaxPrice { get; init; }

    [Range(typeof(decimal), "0", "5", ErrorMessage = "Minimum rating must be between 0 and 5.")]
    public decimal? MinRating { get; init; }

    public string? Sort { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var normalizedSearch = NormalizeOptional(Search);
        if (normalizedSearch?.Length > MaxSearchLength)
        {
            yield return new ValidationResult(
                $"Search must not exceed {MaxSearchLength} characters.",
                [nameof(Search)]);
        }

        if (MinPrice > MaxPrice)
        {
            yield return new ValidationResult(
                "Minimum price must not exceed maximum price.",
                [nameof(MinPrice), nameof(MaxPrice)]);
        }

        var normalizedBrands = NormalizeBrands();
        if (normalizedBrands.Count > MaxBrands)
        {
            yield return new ValidationResult(
                $"No more than {MaxBrands} brands may be selected.",
                [nameof(Brands)]);
        }

        var normalizedSort = NormalizeOptional(Sort)?.ToLowerInvariant();
        if (normalizedSort is not null && !SupportedSorts.Contains(normalizedSort))
        {
            yield return new ValidationResult(
                "The selected sort option is not supported.",
                [nameof(Sort)]);
        }
    }

    public ProductCatalogQuery ToCatalogQuery() => new(
        Page,
        PageSize,
        NormalizeOptional(Search),
        CategoryId,
        SubCategoryId,
        NormalizeBrands(),
        MinPrice,
        MaxPrice,
        MinRating,
        NormalizeOptional(Sort)?.ToLowerInvariant());

    private IReadOnlyCollection<string> NormalizeBrands() =>
        (Brands ?? [])
            .SelectMany(brand => brand.Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Select(brand => brand.Trim())
            .Where(brand => brand.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed record ProductCatalogQuery(
    int Page = 1,
    int PageSize = 30,
    string? Search = null,
    int? CategoryId = null,
    int? SubCategoryId = null,
    IReadOnlyCollection<string>? Brands = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    decimal? MinRating = null,
    string? Sort = null);

public sealed record CategoryResponse(
    int Id,
    string Name,
    int? ParentCategoryId);

internal sealed record ProductsApiTokenRequest(
    string Subject,
    IReadOnlyCollection<string> Roles);

internal sealed record ProductsApiTokenResponse(
    string AccessToken,
    string TokenType,
    DateTime ExpiresAtUtc);
