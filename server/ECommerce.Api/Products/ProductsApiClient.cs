using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ECommerce.Api.Products;

internal sealed class ProductsApiClient(
    HttpClient httpClient,
    ProductsApiTokenProvider tokenProvider) : IProductsApiClient
{
    public async Task<DownstreamApiResult<PagedProductsResponse>> GetProductsAsync(
        ProductCatalogQuery query,
        CancellationToken cancellationToken)
    {
        var requestUri = BuildProductsUri(query);

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

    private static string BuildProductsUri(ProductCatalogQuery query)
    {
        var parameters = new List<string>
        {
            $"page={query.Page}",
            $"pageSize={query.PageSize}"
        };

        Add(parameters, "search", query.Search);
        Add(parameters, "categoryId", query.CategoryId);
        Add(parameters, "subCategoryId", query.SubCategoryId);
        foreach (var brand in query.Brands ?? [])
        {
            Add(parameters, "brands", brand);
        }
        Add(parameters, "minPrice", query.MinPrice);
        Add(parameters, "maxPrice", query.MaxPrice);
        Add(parameters, "minRating", query.MinRating);
        Add(parameters, "sort", query.Sort);

        return $"api/products?{string.Join('&', parameters)}";
    }

    private static void Add(List<string> parameters, string name, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            parameters.Add($"{name}={Uri.EscapeDataString(value)}");
        }
    }

    private static void Add(List<string> parameters, string name, int? value)
    {
        if (value.HasValue)
        {
            parameters.Add($"{name}={value.Value}");
        }
    }

    private static void Add(List<string> parameters, string name, decimal? value)
    {
        if (value.HasValue)
        {
            parameters.Add($"{name}={value.Value.ToString(CultureInfo.InvariantCulture)}");
        }
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
