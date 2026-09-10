using Polly.CircuitBreaker;
using Polly.Timeout;

namespace ECommerce.Api.Products;

internal sealed class ProductsApiExceptionHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        try
        {
            return await base.SendAsync(request, cancellationToken);
        }
        catch (Exception exception) when (
            exception is HttpRequestException or TimeoutRejectedException or BrokenCircuitException)
        {
            throw new ProductsApiException("The products API request failed.", exception);
        }
    }
}
