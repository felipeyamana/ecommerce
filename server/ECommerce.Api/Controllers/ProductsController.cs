using ECommerce.Api.Products;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(IProductsApiClient productsApiClient) : ControllerBase
{
    private const int MaxSearchLength = 200;

    [HttpGet]
    [ProducesResponseType(typeof(PagedProductsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<PagedProductsResponse>> GetProducts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            return BadRequest(new { message = "Page must be at least 1." });
        }

        if (pageSize is < 1 or > 30)
        {
            return BadRequest(new { message = "Page size must be between 1 and 30." });
        }

        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        if (normalizedSearch?.Length > MaxSearchLength)
        {
            return BadRequest(new { message = $"Search must not exceed {MaxSearchLength} characters." });
        }

        var result = await productsApiClient.GetProductsAsync(page, pageSize, normalizedSearch, cancellationToken);
        return Respond(result);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<ProductResponse>> GetProduct(
        long id,
        CancellationToken cancellationToken)
    {
        var result = await productsApiClient.GetProductAsync(id, cancellationToken);

        return Respond(result);
    }

    private ActionResult<T> Respond<T>(DownstreamApiResult<T> result)
        where T : class =>
        result.IsSuccess
            ? StatusCode(result.StatusCode, result.Value)
            : StatusCode(result.StatusCode, new { message = result.Error });
}
