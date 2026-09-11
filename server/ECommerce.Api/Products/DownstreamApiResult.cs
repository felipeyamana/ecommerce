namespace ECommerce.Api.Products;

public sealed record DownstreamApiResult<T>(T? Value, int StatusCode, string? Error)
    where T : class
{
    public bool IsSuccess => Value is not null && Error is null;

    public static DownstreamApiResult<T> Success(T value, int statusCode) =>
        new(value, statusCode, null);

    public static DownstreamApiResult<T> Failure(int statusCode, string error) =>
        new(null, statusCode, error);
}
