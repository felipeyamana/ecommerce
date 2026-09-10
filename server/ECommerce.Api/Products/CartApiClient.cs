using ECommerce.Api.Identity;
using System.Net.Http.Headers;
using System.Security.Claims;

namespace ECommerce.Api.Products;

internal sealed class CartApiClient(
    HttpClient httpClient,
    DownstreamTokenService tokenService) : ICartApiClient
{
    private static readonly string[] CartRole = ["CartUser"];

    public Task<CartApiResult> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Get, "api/cart", null, ["cart:read"], cancellationToken);

    public Task<CartApiResult> SetItemAsync(
        ClaimsPrincipal user,
        long productId,
        SetCartItemRequest request,
        CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Put, $"api/cart/items/{productId}", request, ["cart:write"], cancellationToken);

    public Task<CartApiResult> RemoveItemAsync(
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

    public Task<CartApiResult> ClearAsync(
        ClaimsPrincipal user,
        Guid? version,
        CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Delete, $"api/cart{VersionQuery(version)}", null, ["cart:write"], cancellationToken);

    private async Task<CartApiResult> SendAsync(
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
            return new CartApiResult(cart, (int)response.StatusCode, null);
        }

        if ((int)response.StatusCode is 400 or 403 or 409)
        {
            var error = await response.Content.ReadFromJsonAsync<CartErrorResponse>(cancellationToken: cancellationToken);
            return new CartApiResult(null, (int)response.StatusCode, error?.Message ?? "The cart could not be updated.");
        }

        throw new ProductsApiException($"The products API returned status code {(int)response.StatusCode} for a cart request.");
    }

    private static string VersionQuery(Guid? version) =>
        version.HasValue ? $"?version={Uri.EscapeDataString(version.Value.ToString())}" : string.Empty;

    private sealed record CartErrorResponse(string Message);
}
