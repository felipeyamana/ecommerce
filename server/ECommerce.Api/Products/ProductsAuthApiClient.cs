using System.Net.Http.Json;
using System.Text.Json;
using ECommerce.Api.Contracts;
using Microsoft.Extensions.Options;

namespace ECommerce.Api.Products;

public interface IProductsAuthApiClient
{
    Task<ProductsAuthResult> RegisterAsync(
        RegisterRequest request,
        string clientIp,
        CancellationToken cancellationToken);

    Task<ProductsAuthResult> LoginAsync(
        LoginRequest request,
        string clientIp,
        CancellationToken cancellationToken);
}

public sealed record ProductsAuthUser(
    Guid Id,
    string Email,
    IReadOnlyCollection<string> Roles);

public sealed record ProductsAuthResult(
    ProductsAuthUser? User,
    int StatusCode,
    JsonElement? Error)
{
    public bool IsSuccess => User is not null && Error is null;

    public static ProductsAuthResult Success(ProductsAuthUser user, int statusCode) =>
        new(user, statusCode, null);

    public static ProductsAuthResult Failure(int statusCode, JsonElement? error) =>
        new(null, statusCode, error);
}

internal sealed class ProductsAuthApiClient(
    HttpClient client,
    IOptions<ProductsApiOptions> options) : IProductsAuthApiClient
{
    private readonly ProductsApiOptions _options = options.Value;

    public Task<ProductsAuthResult> RegisterAsync(
        RegisterRequest request,
        string clientIp,
        CancellationToken cancellationToken) =>
        SendAsync(
            "api/auth/register",
            new ProductsRegisterRequest(request.Email, request.Password, request.ConfirmPassword),
            clientIp,
            cancellationToken);

    public Task<ProductsAuthResult> LoginAsync(
        LoginRequest request,
        string clientIp,
        CancellationToken cancellationToken) =>
        SendAsync(
            "api/auth/login",
            new ProductsLoginRequest(request.Email, request.Password),
            clientIp,
            cancellationToken);

    private async Task<ProductsAuthResult> SendAsync<TRequest>(
        string path,
        TRequest requestBody,
        string clientIp,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Add("X-API-Key", _options.ApiKey);
        request.Headers.Add("X-Client-IP", clientIp);

        using var response = await client.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            var user = await response.Content.ReadFromJsonAsync<ProductsAuthUser>(
                cancellationToken: cancellationToken);

            return user is null
                ? ProductsAuthResult.Failure(
                    StatusCodes.Status502BadGateway,
                    JsonSerializer.SerializeToElement(new { message = "The products API returned an empty authentication response." }))
                : ProductsAuthResult.Success(user, (int)response.StatusCode);
        }

        JsonElement? error = null;
        if (response.Content.Headers.ContentLength != 0)
        {
            try
            {
                error = await response.Content.ReadFromJsonAsync<JsonElement>(
                    cancellationToken: cancellationToken);
            }
            catch (JsonException)
            {
                error = JsonSerializer.SerializeToElement(
                    new { message = "The products API returned an invalid authentication response." });
            }
        }

        return ProductsAuthResult.Failure((int)response.StatusCode, error);
    }

    private sealed record ProductsLoginRequest(string Email, string Password);

    private sealed record ProductsRegisterRequest(
        string Email,
        string Password,
        string ConfirmPassword);
}
