using ECommerce.Api.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class AddressesController(ICustomerAddressesApiClient addressesApiClient) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerAddressResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) =>
        Respond(await addressesApiClient.GetAllAsync(User, cancellationToken));

    [HttpPost]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(typeof(CustomerAddressResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(
        CreateCustomerAddressRequest request,
        CancellationToken cancellationToken) =>
        Respond(await addressesApiClient.CreateAsync(User, request, cancellationToken));

    [HttpPut("{addressId:guid}")]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(typeof(CustomerAddressResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(
        Guid addressId,
        UpdateCustomerAddressRequest request,
        CancellationToken cancellationToken) =>
        Respond(await addressesApiClient.UpdateAsync(User, addressId, request, cancellationToken));

    [HttpPut("{addressId:guid}/default")]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(typeof(CustomerAddressResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetDefault(
        Guid addressId,
        SetDefaultCustomerAddressRequest request,
        CancellationToken cancellationToken) =>
        Respond(await addressesApiClient.SetDefaultAsync(User, addressId, request, cancellationToken));

    [HttpDelete("{addressId:guid}")]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid addressId,
        [FromQuery] string version,
        CancellationToken cancellationToken)
    {
        var result = await addressesApiClient.DeleteAsync(User, addressId, version, cancellationToken);
        return result.IsSuccess
            ? StatusCode(result.StatusCode)
            : StatusCode(result.StatusCode, new { message = result.Error });
    }

    private IActionResult Respond<T>(DownstreamApiResult<T> result)
        where T : class =>
        result.IsSuccess
            ? StatusCode(result.StatusCode, result.Value)
            : StatusCode(result.StatusCode, new { message = result.Error });
}
