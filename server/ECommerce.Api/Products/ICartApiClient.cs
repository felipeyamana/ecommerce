using System.Security.Claims;

namespace ECommerce.Api.Products;

public interface ICartApiClient
{
    Task<DownstreamApiResult<CartResponse>> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken);

    Task<DownstreamApiResult<CartResponse>> SetItemAsync(
        ClaimsPrincipal user,
        long productId,
        SetCartItemRequest request,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<CartResponse>> RemoveItemAsync(
        ClaimsPrincipal user,
        long productId,
        Guid? version,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<CartResponse>> ClearAsync(
        ClaimsPrincipal user,
        Guid? version,
        CancellationToken cancellationToken);
}
