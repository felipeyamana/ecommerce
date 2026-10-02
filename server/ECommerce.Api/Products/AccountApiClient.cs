using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using ECommerce.Api.Identity;

namespace ECommerce.Api.Products;

internal sealed class AccountApiClient(
    HttpClient httpClient,
    DownstreamTokenService tokenService) : IAccountApiClient
{
    private const string AccountPath = "api/customers/me";
    private static readonly string[] CustomerRole = ["CustomerUser"];

    public Task<DownstreamApiResult<AccountProfileResponse>> GetAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Get, null, ["customer:read"], cancellationToken);

    public Task<DownstreamApiResult<AccountProfileResponse>> UpdateAsync(
        ClaimsPrincipal user,
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken) =>
        SendAsync(user, HttpMethod.Put, request, ["customer:write"], cancellationToken);

    private async Task<DownstreamApiResult<AccountProfileResponse>> SendAsync(
        ClaimsPrincipal user,
        HttpMethod method,
        UpdateAccountProfileRequest? body,
        string[] permissions,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, AccountPath);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            tokenService.CreateToken(user, permissions, CustomerRole));

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            var profile = await response.Content.ReadFromJsonAsync<AccountProfileResponse>(
                cancellationToken: cancellationToken)
                ?? throw new ProductsApiException("The products API returned an empty account response.");

            return DownstreamApiResult<AccountProfileResponse>.Success(
                profile,
                (int)response.StatusCode);
        }

        var error = await DownstreamErrorReader.ReadAsync(
            response,
            "The account request could not be completed.",
            cancellationToken);
        return DownstreamApiResult<AccountProfileResponse>.Failure(
            (int)response.StatusCode,
            error);
    }
}
