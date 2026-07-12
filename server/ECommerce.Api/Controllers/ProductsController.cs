using ECommerce.Api.Products;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(IProductsApiClient productsApiClient) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedProductsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<PagedProductsResponse>> GetProducts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
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

        try
        {
            var products = await productsApiClient.GetProductsAsync(page, pageSize, cancellationToken);
            return Ok(products);
        }
        catch (Exception exception) when (IsUpstreamFailure(exception))
        {
            return ProductsApiUnavailable();
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<ProductResponse>> GetProduct(
        long id,
        CancellationToken cancellationToken)
    {
        try
        {
            var product = await productsApiClient.GetProductAsync(id, cancellationToken);

            return product is null
                ? NotFound(new { message = $"Product {id} was not found." })
                : Ok(product);
        }
        catch (Exception exception) when (IsUpstreamFailure(exception))
        {
            return ProductsApiUnavailable();
        }
    }

    private ObjectResult ProductsApiUnavailable() =>
        Problem(
            statusCode: StatusCodes.Status502BadGateway,
            title: "Products service unavailable",
            detail: "The products service could not complete the request.");

    private static bool IsUpstreamFailure(Exception exception) =>
        exception is HttpRequestException or InvalidOperationException;
}
