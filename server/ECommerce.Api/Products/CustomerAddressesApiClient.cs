using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using ECommerce.Api.Identity;

namespace ECommerce.Api.Products;

internal sealed class CustomerAddressesApiClient(
    HttpClient httpClient,
    DownstreamTokenService tokenService) : ICustomerAddressesApiClient
{
    private const string AddressesPath = "api/customers/me/addresses";
    private static readonly string[] CustomerRole = ["CustomerUser"];

    public Task<DownstreamApiResult<IReadOnlyList<CustomerAddressResponse>>> GetAllAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken) =>
        SendAsync<IReadOnlyList<CustomerAddressResponse>>(
            user,
            HttpMethod.Get,
            AddressesPath,
            null,
            ["addresses:read"],
            cancellationToken);

    public Task<DownstreamApiResult<CustomerAddressResponse>> CreateAsync(
        ClaimsPrincipal user,
        CreateCustomerAddressRequest request,
        CancellationToken cancellationToken) =>
        SendAsync<CustomerAddressResponse>(
            user,
            HttpMethod.Post,
            AddressesPath,
            request,
            ["addresses:write"],
            cancellationToken);

    public Task<DownstreamApiResult<CustomerAddressResponse>> UpdateAsync(
        ClaimsPrincipal user,
        Guid addressId,
        UpdateCustomerAddressRequest request,
        CancellationToken cancellationToken) =>
        SendAsync<CustomerAddressResponse>(
            user,
            HttpMethod.Put,
            $"{AddressesPath}/{addressId}",
            request,
            ["addresses:write"],
            cancellationToken);

    public Task<DownstreamApiResult<CustomerAddressResponse>> SetDefaultAsync(
        ClaimsPrincipal user,
        Guid addressId,
        SetDefaultCustomerAddressRequest request,
        CancellationToken cancellationToken) =>
        SendAsync<CustomerAddressResponse>(
            user,
            HttpMethod.Put,
            $"{AddressesPath}/{addressId}/default",
            request,
            ["addresses:write"],
            cancellationToken);

    public async Task<DownstreamApiResult> DeleteAsync(
        ClaimsPrincipal user,
        Guid addressId,
        string version,
        CancellationToken cancellationToken)
    {
        var requestUri = $"{AddressesPath}/{addressId}?version={Uri.EscapeDataString(version)}";
        using var request = CreateRequest(user, HttpMethod.Delete, requestUri, null, ["addresses:write"]);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            return DownstreamApiResult.Success((int)response.StatusCode);
        }

        var error = await ReadErrorAsync(response, cancellationToken);
        return DownstreamApiResult.Failure((int)response.StatusCode, error);
    }

    private async Task<DownstreamApiResult<T>> SendAsync<T>(
        ClaimsPrincipal user,
        HttpMethod method,
        string requestUri,
        object? body,
        string[] permissions,
        CancellationToken cancellationToken)
        where T : class
    {
        using var request = CreateRequest(user, method, requestUri, body, permissions);
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var value = await response.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken)
                ?? throw new ProductsApiException("The products API returned an empty address response.");
            return DownstreamApiResult<T>.Success(value, (int)response.StatusCode);
        }

        var error = await ReadErrorAsync(response, cancellationToken);
        return DownstreamApiResult<T>.Failure((int)response.StatusCode, error);
    }

    private HttpRequestMessage CreateRequest(
        ClaimsPrincipal user,
        HttpMethod method,
        string requestUri,
        object? body,
        string[] permissions)
    {
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            tokenService.CreateToken(user, permissions, CustomerRole));

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private static Task<string> ReadErrorAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken) =>
        DownstreamErrorReader.ReadAsync(
            response,
            "The address request could not be completed.",
            cancellationToken);
}
