using ECommerce.Api.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class OrdersController(IOrdersApiClient ordersApiClient) : ControllerBase
{
    [HttpPost]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(typeof(OrderDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        CreateOrderRequest request,
        CancellationToken cancellationToken) =>
        Respond(await ordersApiClient.CreateAsync(User, request, cancellationToken));

    [HttpGet("{orderId:guid}")]
    [ProducesResponseType(typeof(OrderDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        Guid orderId,
        CancellationToken cancellationToken) =>
        Respond(await ordersApiClient.GetAsync(User, orderId, cancellationToken));

    [HttpPost("{orderId:guid}/checkout")]
    [ValidateAntiForgeryToken]
    [ProducesResponseType(typeof(CheckoutSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CreateCheckoutSession(
        Guid orderId,
        CancellationToken cancellationToken) =>
        Respond(await ordersApiClient.CreateCheckoutSessionAsync(
            User,
            orderId,
            cancellationToken));

    private IActionResult Respond<T>(DownstreamApiResult<T> result)
        where T : class =>
        result.IsSuccess
            ? StatusCode(result.StatusCode, result.Value)
            : StatusCode(result.StatusCode, new { message = result.Error });
}
