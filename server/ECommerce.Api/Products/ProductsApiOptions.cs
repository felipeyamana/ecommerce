namespace ECommerce.Api.Products;

public sealed class ProductsApiOptions
{
    public const string SectionName = "ProductsApi";

    public required Uri BaseUrl { get; init; }

    public required string ApiKey { get; init; }

    public string Subject { get; init; } = "ecommerce-api";
}
