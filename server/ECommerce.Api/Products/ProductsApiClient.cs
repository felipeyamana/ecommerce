using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ECommerce.Api.Products;

internal sealed class ProductsApiClient(
    HttpClient httpClient,
    ProductsApiTokenProvider tokenProvider) : IProductsApiClient
{
    public async Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken)
    {
        var requestUri = $"api/products?page={page}&pageSize={pageSize}";
        if (!string.IsNullOrWhiteSpace(search))
        {
            requestUri += $"&search={Uri.EscapeDataString(search)}";
        }

        using var request = await CreateRequestAsync(
            HttpMethod.Get,
            requestUri,
            cancellationToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return await FailureAsync<PagedProductsResponse>(response, cancellationToken);
        }

        var products = await response.Content.ReadFromJsonAsync<PagedProductsResponse>(
            cancellationToken: cancellationToken)
            ?? throw new ProductsApiException("The products API returned an empty products response.");
        return DownstreamApiResult<PagedProductsResponse>.Success(products, (int)response.StatusCode);
    }

    public async Task<DownstreamApiResult<ProductResponse>> GetProductAsync(
        long id,
        CancellationToken cancellationToken)
    {
        using var request = await CreateRequestAsync(
            HttpMethod.Get,
            $"api/products/{id}",
            cancellationToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return await FailureAsync<ProductResponse>(response, cancellationToken);
        }

        var product = await response.Content.ReadFromJsonAsync<ProductResponse>(
            cancellationToken: cancellationToken)
            ?? throw new ProductsApiException("The products API returned an empty product response.");
        return DownstreamApiResult<ProductResponse>.Success(product, (int)response.StatusCode);
    }

    public async Task<DownstreamApiResult<IReadOnlyList<CategoryResponse>>> GetCategoriesAsync(
        CancellationToken cancellationToken)
    {
        using var request = await CreateRequestAsync(
            HttpMethod.Get,
            "api/categories",
            cancellationToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return await FailureAsync<IReadOnlyList<CategoryResponse>>(response, cancellationToken);
        }

        var categories = await response.Content.ReadFromJsonAsync<IReadOnlyList<CategoryResponse>>(
            cancellationToken: cancellationToken)
            ?? throw new ProductsApiException("The products API returned an empty categories response.");
        return DownstreamApiResult<IReadOnlyList<CategoryResponse>>.Success(categories, (int)response.StatusCode);
    }

    private static async Task<DownstreamApiResult<T>> FailureAsync<T>(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
        where T : class
    {
        var error = await DownstreamErrorReader.ReadAsync(
            response,
            "The products service could not complete the request.",
            cancellationToken);
        return DownstreamApiResult<T>.Failure(
            (int)response.StatusCode,
            error);
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
