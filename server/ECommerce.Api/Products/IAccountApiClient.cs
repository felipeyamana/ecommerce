using System.Security.Claims;

namespace ECommerce.Api.Products;

public interface IAccountApiClient
{
    Task<DownstreamApiResult<AccountProfileResponse>> GetAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<AccountProfileResponse>> UpdateAsync(
        ClaimsPrincipal user,
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken);
}
