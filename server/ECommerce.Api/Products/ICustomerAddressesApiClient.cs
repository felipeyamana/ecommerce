using System.Security.Claims;

namespace ECommerce.Api.Products;

public interface ICustomerAddressesApiClient
{
    Task<DownstreamApiResult<IReadOnlyList<CustomerAddressResponse>>> GetAllAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<CustomerAddressResponse>> CreateAsync(
        ClaimsPrincipal user,
        CreateCustomerAddressRequest request,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<CustomerAddressResponse>> UpdateAsync(
        ClaimsPrincipal user,
        Guid addressId,
        UpdateCustomerAddressRequest request,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult<CustomerAddressResponse>> SetDefaultAsync(
        ClaimsPrincipal user,
        Guid addressId,
        SetDefaultCustomerAddressRequest request,
        CancellationToken cancellationToken);

    Task<DownstreamApiResult> DeleteAsync(
        ClaimsPrincipal user,
        Guid addressId,
        string version,
        CancellationToken cancellationToken);
}
