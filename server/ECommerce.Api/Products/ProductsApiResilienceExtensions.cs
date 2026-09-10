using Microsoft.Extensions.Http.Resilience;
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
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.Delay = TimeSpan.FromMilliseconds(500);
            options.Retry.BackoffType = DelayBackoffType.Exponential;
            options.Retry.UseJitter = true;

            options.CircuitBreaker.FailureRatio = 0.5;
            options.CircuitBreaker.MinimumThroughput = 4;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(15);

            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(15);
        });

        return builder;
    }
}
