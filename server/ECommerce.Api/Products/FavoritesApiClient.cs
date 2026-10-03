using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using ECommerce.Api.Identity;

namespace ECommerce.Api.Products;

public sealed record FavoriteResponse(DateTime CreatedAtUtc, ProductResponse Product);

public interface IFavoritesApiClient
{
    Task<DownstreamApiResult<IReadOnlyList<FavoriteResponse>>> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken);
    Task<DownstreamApiResult<FavoriteResponse>> AddAsync(ClaimsPrincipal user, long productId, CancellationToken cancellationToken);
    Task<DownstreamApiResult> RemoveAsync(ClaimsPrincipal user, long productId, CancellationToken cancellationToken);
}

internal sealed class FavoritesApiClient(HttpClient client, DownstreamTokenService tokens) : IFavoritesApiClient
{
    private const string Path = "api/customers/me/favorites";

    public Task<DownstreamApiResult<IReadOnlyList<FavoriteResponse>>> GetAsync(ClaimsPrincipal user, CancellationToken cancellationToken) =>
        SendAsync<IReadOnlyList<FavoriteResponse>>(user, HttpMethod.Get, Path, "favorites:read", cancellationToken);

    public Task<DownstreamApiResult<FavoriteResponse>> AddAsync(ClaimsPrincipal user, long productId, CancellationToken cancellationToken) =>
        SendAsync<FavoriteResponse>(user, HttpMethod.Put, $"{Path}/{productId}", "favorites:write", cancellationToken);

    public async Task<DownstreamApiResult> RemoveAsync(ClaimsPrincipal user, long productId, CancellationToken cancellationToken)
    {
        using var request = CreateRequest(user, HttpMethod.Delete, $"{Path}/{productId}", "favorites:write");
        using var response = await client.SendAsync(request, cancellationToken);
        return response.IsSuccessStatusCode
            ? DownstreamApiResult.Success((int)response.StatusCode)
            : DownstreamApiResult.Failure((int)response.StatusCode, await ReadErrorAsync(response, cancellationToken));
    }

    private async Task<DownstreamApiResult<T>> SendAsync<T>(ClaimsPrincipal user, HttpMethod method, string path, string scope, CancellationToken cancellationToken) where T : class
    {
        using var request = CreateRequest(user, method, path, scope);
        using var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            return DownstreamApiResult<T>.Failure((int)response.StatusCode, await ReadErrorAsync(response, cancellationToken));
        var value = await response.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken)
            ?? throw new ProductsApiException("The products API returned an empty favourites response.");
        return DownstreamApiResult<T>.Success(value, (int)response.StatusCode);
    }

    private HttpRequestMessage CreateRequest(ClaimsPrincipal user, HttpMethod method, string path, string scope)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens.CreateToken(user, [scope], ["CustomerUser"]));
        return request;
    }

    private static Task<string> ReadErrorAsync(HttpResponseMessage response, CancellationToken cancellationToken) =>
        DownstreamErrorReader.ReadAsync(response, "The favourites request could not be completed.", cancellationToken);
}
