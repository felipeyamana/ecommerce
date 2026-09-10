namespace ECommerce.Api.Products;

public sealed record SetCartItemRequest(int Quantity, Guid? Version);

public sealed record CartResponse(
    Guid Version,
    IReadOnlyList<CartItemResponse> Items,
    int TotalQuantity,
    string? Currency,
    decimal? Subtotal);

public sealed record CartItemResponse(
    long ProductId,
    string? Name,
    int Quantity,
    decimal UnitPriceAtAddition,
    string CurrencyAtAddition,
    decimal? CurrentUnitPrice,
    string? CurrentCurrency,
    bool PriceChanged,
    bool IsAvailable,
    string? UnavailableReason,
    decimal? LineTotal,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CartApiResult(CartResponse? Value, int StatusCode, string? Error)
{
    public bool IsSuccess => Error is null;
}
