using ECommerce.Api.Products;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(IProductsApiClient productsApiClient) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedProductsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<PagedProductsResponse>> GetProducts(
        [FromQuery] GetProductsRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await productsApiClient.GetProductsAsync(
            request.ToCatalogQuery(),
            cancellationToken);
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
