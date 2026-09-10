using ECommerce.Api.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class CartController(ICartApiClient cartApiClient) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(CartResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await cartApiClient.GetAsync(User, cancellationToken));

    [HttpPut("items/{productId:long}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SetItem(
        long productId,
        SetCartItemRequest request,
        CancellationToken cancellationToken)
    {
        if (productId < 1)
        {
            return BadRequest(new { message = "Product ID must be positive." });
        }

        if (request.Quantity is < 1 or > 99)
        {
            return BadRequest(new { message = "Quantity must be between 1 and 99." });
        }

        return Respond(await cartApiClient.SetItemAsync(User, productId, request, cancellationToken));
    }

    [HttpDelete("items/{productId:long}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> RemoveItem(
        long productId,
        [FromQuery] Guid? version,
        CancellationToken cancellationToken) =>
        Respond(await cartApiClient.RemoveItemAsync(User, productId, version, cancellationToken));

    [HttpDelete]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Clear(
        [FromQuery] Guid? version,
        CancellationToken cancellationToken) =>
        Respond(await cartApiClient.ClearAsync(User, version, cancellationToken));

    private IActionResult Respond(CartApiResult result) => result.IsSuccess
        ? Ok(result.Value)
        : StatusCode(result.StatusCode, new { message = result.Error });
}
