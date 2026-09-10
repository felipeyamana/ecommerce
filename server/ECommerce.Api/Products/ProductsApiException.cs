namespace ECommerce.Api.Products;

internal sealed class ProductsApiException : Exception
{
    public ProductsApiException(string message)
        : base(message)
    {
    }

    public ProductsApiException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
