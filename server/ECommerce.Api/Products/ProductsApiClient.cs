using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ECommerce.Api.Products;

internal sealed class ProductsApiClient(
    HttpClient httpClient,
    ProductsApiTokenProvider tokenProvider) : IProductsApiClient
{
    public async Task<PagedProductsResponse> GetProductsAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        using var request = await CreateRequestAsync(
            HttpMethod.Get,
            $"api/products?page={page}&pageSize={pageSize}",
            cancellationToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new ProductsApiException(
                $"The products API returned status code {(int)response.StatusCode}.");
        }

        return await response.Content.ReadFromJsonAsync<PagedProductsResponse>(
            cancellationToken: cancellationToken)
            ?? throw new ProductsApiException("The products API returned an empty products response.");
    }

    public async Task<ProductResponse?> GetProductAsync(
        long id,
        CancellationToken cancellationToken)
    {
        using var request = await CreateRequestAsync(
            HttpMethod.Get,
            $"api/products/{id}",
            cancellationToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new ProductsApiException(
                $"The products API returned status code {(int)response.StatusCode}.");
        }

        return await response.Content.ReadFromJsonAsync<ProductResponse>(
            cancellationToken: cancellationToken)
            ?? throw new ProductsApiException("The products API returned an empty product response.");
    }

    private async Task<HttpRequestMessage> CreateRequestAsync(
        HttpMethod method,
        string requestUri,
        CancellationToken cancellationToken)
    {
        var accessToken = await tokenProvider.GetAccessTokenAsync(cancellationToken);
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return request;
    }
}
