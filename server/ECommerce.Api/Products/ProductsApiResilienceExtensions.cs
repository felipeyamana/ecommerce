using Polly;

namespace ECommerce.Api.Products;

public static class ProductsApiResilienceExtensions
{
    public static IHttpClientBuilder AddProductsApiResilience(this IHttpClientBuilder builder)
    {
        builder.AddStandardResilienceHandler(options =>
        {
            // Retrying cart PUT/DELETE requests is deliberate: they set absolute values and
            // carry a cart version, so an ambiguous first attempt cannot be applied twice.
            options.Retry.MaxRetryAttempts = 2;
            options.Retry.Delay = TimeSpan.FromSeconds(1);
            options.Retry.BackoffType = DelayBackoffType.Exponential;
            options.Retry.UseJitter = true;

            options.CircuitBreaker.FailureRatio = 0.75;
            options.CircuitBreaker.MinimumThroughput = 10;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(15);

            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(20);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(65);
        });

        return builder;
    }
}
