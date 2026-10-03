using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using ECommerce.Api.Identity;

namespace ECommerce.Api.Products;

internal sealed class OrdersApiClient(
    HttpClient httpClient,
    DownstreamTokenService tokenService) : IOrdersApiClient
{
    private const string OrdersPath = "api/orders";
    private static readonly string[] OrderRole = ["OrderUser"];

    public Task<DownstreamApiResult<PagedOrdersResponse>> ListAsync(
        ClaimsPrincipal user,
        int page,
        int pageSize,
        CancellationToken cancellationToken) =>
        SendAsync<PagedOrdersResponse>(
            user,
            HttpMethod.Get,
            $"{OrdersPath}?page={page}&pageSize={pageSize}",
            null,
            ["orders:read"],
            "The orders could not be loaded.",
            cancellationToken);

    public Task<DownstreamApiResult<OrderDetailResponse>> CreateAsync(
        ClaimsPrincipal user,
        CreateOrderRequest request,
        CancellationToken cancellationToken) =>
        SendAsync<OrderDetailResponse>(
            user,
            HttpMethod.Post,
            OrdersPath,
            request,
            ["orders:write"],
            "The order could not be created.",
            cancellationToken);

    public Task<DownstreamApiResult<OrderDetailResponse>> GetAsync(
        ClaimsPrincipal user,
        Guid orderId,
        CancellationToken cancellationToken) =>
        SendAsync<OrderDetailResponse>(
            user,
            HttpMethod.Get,
            $"{OrdersPath}/{orderId:D}",
            null,
            ["orders:read"],
            "The order could not be loaded.",
            cancellationToken);

    public Task<DownstreamApiResult<CheckoutSessionResponse>> CreateCheckoutSessionAsync(
        ClaimsPrincipal user,
        Guid orderId,
        CancellationToken cancellationToken) =>
        SendAsync<CheckoutSessionResponse>(
            user,
            HttpMethod.Post,
            $"{OrdersPath}/{orderId:D}/checkout",
            null,
            ["orders:write"],
            "Checkout could not be started.",
            cancellationToken);

    private async Task<DownstreamApiResult<T>> SendAsync<T>(
        ClaimsPrincipal user,
        HttpMethod method,
        string requestUri,
        object? body,
        string[] permissions,
        string fallbackError,
        CancellationToken cancellationToken)
        where T : class
    {
        using var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            tokenService.CreateToken(user, permissions, OrderRole));

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            var value = await response.Content.ReadFromJsonAsync<T>(
                cancellationToken: cancellationToken)
                ?? throw new ProductsApiException(
                    "The products API returned an empty order response.");

            return DownstreamApiResult<T>.Success(value, (int)response.StatusCode);
        }

        var error = await DownstreamErrorReader.ReadAsync(
            response,
            fallbackError,
            cancellationToken);
        return DownstreamApiResult<T>.Failure((int)response.StatusCode, error);
    }
}
