namespace ECommerce.Api.Products;

public sealed record CreateOrderRequest(
    Guid AddressId,
    Guid? CartVersion);

public sealed record OrderSummaryResponse(
    Guid Id,
    string Status,
    string CurrencyCode,
    decimal GrandTotal,
    int TotalQuantity,
    DateTime CreatedAtUtc);

public sealed record PagedOrdersResponse(
    IReadOnlyList<OrderSummaryResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record OrderShippingAddressResponse(
    string RecipientName,
    string? PhoneNumber,
    string? PhoneRegionCode,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string Region,
    string PostalCode,
    string CountryCode);

public sealed record OrderItemResponse(
    long? ProductId,
    string ProductName,
    string? ProductExternalId,
    int Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal LineTotal);

public sealed record OrderDetailResponse(
    Guid Id,
    string Status,
    string CustomerEmail,
    OrderShippingAddressResponse ShippingAddress,
    string CurrencyCode,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal ShippingTotal,
    decimal TaxTotal,
    decimal GrandTotal,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyList<OrderItemResponse> Items,
    string PaymentStatus,
    DateTime? PaidAtUtc);

public sealed record CheckoutSessionResponse(
    Guid OrderId,
    string SessionId,
    string ClientSecret);
