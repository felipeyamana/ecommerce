using System.Security.Claims;

namespace ECommerce.Api.Products;

public interface ICartApiClient
{
    Task<CartApiResult> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken);

    Task<CartApiResult> SetItemAsync(
        ClaimsPrincipal user,
        long productId,
        SetCartItemRequest request,
        CancellationToken cancellationToken);

    Task<CartApiResult> RemoveItemAsync(
        ClaimsPrincipal user,
        long productId,
        Guid? version,
        CancellationToken cancellationToken);

    Task<CartApiResult> ClearAsync(
        ClaimsPrincipal user,
        Guid? version,
        CancellationToken cancellationToken);
}
