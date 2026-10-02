using System.Net.Http.Json;
using System.Text.Json;

namespace ECommerce.Api.Products;

internal static class DownstreamErrorReader
{
    public static async Task<string> ReadAsync(
        HttpResponseMessage response,
        string fallback,
        CancellationToken cancellationToken)
    {
        if (response.Content.Headers.ContentLength == 0)
        {
            return fallback;
        }

        try
        {
            var error = await response.Content.ReadFromJsonAsync<ApiErrorResponse>(
                cancellationToken: cancellationToken);
            return string.IsNullOrWhiteSpace(error?.Message) ? fallback : error.Message;
        }
        catch (JsonException)
        {
            return fallback;
        }
        catch (NotSupportedException)
        {
            return fallback;
        }
    }

    private sealed record ApiErrorResponse(string Message);
}
