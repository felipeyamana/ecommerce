using System.Security.Claims;

namespace ECommerce.Api.Products;

public interface IOrdersApiClient
{
    Task<DownstreamApiResult<PagedOrdersResponse>> ListAsync(
        ClaimsPrincipal user,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<OrderDetailResponse>> CreateAsync(
        ClaimsPrincipal user,
        CreateOrderRequest request,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<OrderDetailResponse>> GetAsync(
        ClaimsPrincipal user,
        Guid orderId,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<CheckoutSessionResponse>> CreateCheckoutSessionAsync(
        ClaimsPrincipal user,
        Guid orderId,
        CancellationToken cancellationToken);
}
