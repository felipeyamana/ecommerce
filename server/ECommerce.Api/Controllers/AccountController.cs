using ECommerce.Api.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class AccountController(IAccountApiClient accountApiClient) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(AccountProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await accountApiClient.GetAsync(User, cancellationToken));

    [HttpPut]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(typeof(AccountProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken) =>
        Respond(await accountApiClient.UpdateAsync(User, request, cancellationToken));

    private IActionResult Respond(DownstreamApiResult<AccountProfileResponse> result) => result.IsSuccess
        ? StatusCode(result.StatusCode, result.Value)
        : StatusCode(result.StatusCode, new { message = result.Error });
}
