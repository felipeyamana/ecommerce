using ECommerce.Api.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/favorites")]
public sealed class FavoritesController(IFavoritesApiClient favorites) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await favorites.GetAsync(User, cancellationToken));

    [HttpPut("{productId:long:min(1)}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Add(long productId, CancellationToken cancellationToken) =>
        Respond(await favorites.AddAsync(User, productId, cancellationToken));

    [HttpDelete("{productId:long:min(1)}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Remove(long productId, CancellationToken cancellationToken)
    {
        var result = await favorites.RemoveAsync(User, productId, cancellationToken);
        return result.IsSuccess ? StatusCode(result.StatusCode) : StatusCode(result.StatusCode, new { message = result.Error });
    }

    private IActionResult Respond<T>(DownstreamApiResult<T> result) where T : class =>
        result.IsSuccess ? StatusCode(result.StatusCode, result.Value) : StatusCode(result.StatusCode, new { message = result.Error });
}
