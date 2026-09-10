using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace ECommerce.Api.Products;

internal sealed class ProductsApiTokenProvider(
    IHttpClientFactory httpClientFactory,
    IOptions<ProductsApiOptions> options)
{
    private readonly ProductsApiOptions _options = options.Value;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private string? _accessToken;
    private DateTime _expiresAtUtc;

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (HasValidToken())
        {
            return _accessToken!;
        }

        await _lock.WaitAsync(cancellationToken);

        try
        {
            if (HasValidToken())
            {
                return _accessToken!;
            }

            var client = httpClientFactory.CreateClient("ProductsApiAuth");
            using var request = new HttpRequestMessage(HttpMethod.Post, "api/auth/token")
            {
                Content = JsonContent.Create(
                    new ProductsApiTokenRequest(_options.Subject, ["ProductManager"]))
            };

            request.Headers.Add("X-API-Key", _options.ApiKey);

            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new ProductsApiException(
                    $"The products API token endpoint returned status code {(int)response.StatusCode}.");
            }

            var token = await response.Content.ReadFromJsonAsync<ProductsApiTokenResponse>(
                cancellationToken: cancellationToken)
                ?? throw new ProductsApiException("The products API returned an empty token response.");

            _accessToken = token.AccessToken;
            _expiresAtUtc = token.ExpiresAtUtc;

            return _accessToken;
        }
        finally
        {
            _lock.Release();
        }
    }

    private bool HasValidToken() =>
        !string.IsNullOrWhiteSpace(_accessToken) &&
        _expiresAtUtc > DateTime.UtcNow.AddMinutes(1);
}
