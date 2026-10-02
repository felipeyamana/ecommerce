using ECommerce.Api.Identity;
using System.Net.Http.Headers;
using System.Security.Claims;

namespace ECommerce.Api.Products;

internal sealed class CartApiClient(
    HttpClient httpClient,
    DownstreamTokenService tokenService) : ICartApiClient
{
    private static readonly string[] CartRole = ["CartUser"];

    public Task<DownstreamApiResult<CartResponse>> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Get, "api/cart", null, ["cart:read"], cancellationToken);

    public Task<DownstreamApiResult<CartResponse>> SetItemAsync(
        ClaimsPrincipal user,
        long productId,
        SetCartItemRequest request,
        CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Put, $"api/cart/items/{productId}", request, ["cart:write"], cancellationToken);

    public Task<DownstreamApiResult<CartResponse>> RemoveItemAsync(
        ClaimsPrincipal user,
        long productId,
        Guid? version,
        CancellationToken cancellationToken) =>
        SendAsync(
            user,
            HttpMethod.Delete,
            $"api/cart/items/{productId}{VersionQuery(version)}",
            null,
            ["cart:write"],
            cancellationToken);

    public Task<DownstreamApiResult<CartResponse>> ClearAsync(
        ClaimsPrincipal user,
        Guid? version,
        CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Delete, $"api/cart{VersionQuery(version)}", null, ["cart:write"], cancellationToken);

    private async Task<DownstreamApiResult<CartResponse>> SendAsync(
        ClaimsPrincipal user,
        HttpMethod method,
        string requestUri,
        object? body,
        string[] permissions,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            tokenService.CreateToken(user, permissions, CartRole));

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            var cart = await response.Content.ReadFromJsonAsync<CartResponse>(cancellationToken: cancellationToken)
                ?? throw new ProductsApiException("The products API returned an empty cart response.");
            return DownstreamApiResult<CartResponse>.Success(cart, (int)response.StatusCode);
        }

        var error = await DownstreamErrorReader.ReadAsync(
            response,
            "The cart request could not be completed.",
            cancellationToken);
        return DownstreamApiResult<CartResponse>.Failure(
            (int)response.StatusCode,
            error);
    }

    private static string VersionQuery(Guid? version) =>
        version.HasValue ? $"?version={Uri.EscapeDataString(version.Value.ToString())}" : string.Empty;
}
