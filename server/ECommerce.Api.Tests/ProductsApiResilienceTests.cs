using System.Net;
using ECommerce.Api.Products;
using Microsoft.Extensions.DependencyInjection;
using Polly.CircuitBreaker;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class ProductsApiResilienceTests
{
    [Fact]
    public async Task RetriesTransientResponsesUntilTheDependencyRecovers()
    {
        var handler = new StubHandler(attempt => new HttpResponseMessage(
            attempt < 3 ? HttpStatusCode.ServiceUnavailable : HttpStatusCode.OK));
        using var provider = CreateProvider(handler);
        var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient("resilience-test");

        using var response = await client.GetAsync("api/products");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(3, handler.Attempts);
    }

    [Fact]
    public async Task RetriesConnectionFailuresUntilTheDependencyStarts()
    {
        var handler = new StubHandler(attempt => attempt < 3
            ? throw new HttpRequestException("Dependency is still starting.")
            : new HttpResponseMessage(HttpStatusCode.OK));
        using var provider = CreateProvider(handler);
        var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient("resilience-test");

        using var response = await client.GetAsync("api/products");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(3, handler.Attempts);
    }

    [Fact]
    public async Task DoesNotRetryClientErrors()
    {
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.BadRequest));
        using var provider = CreateProvider(handler);
        var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient("resilience-test");

        using var response = await client.GetAsync("api/products");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(1, handler.Attempts);
    }

    [Fact]
    public async Task OpensCircuitAfterSustainedTransientFailures()
    {
        var handler = new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        using var provider = CreateProvider(handler);
        var client = provider.GetRequiredService<IHttpClientFactory>().CreateClient("resilience-test");

        using var response = await client.GetAsync("api/products");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(4, handler.Attempts);

        await Assert.ThrowsAsync<BrokenCircuitException>(
            () => client.GetAsync("api/products"));
        Assert.Equal(4, handler.Attempts);
    }

    private static ServiceProvider CreateProvider(HttpMessageHandler handler)
    {
        var services = new ServiceCollection();
        services
            .AddHttpClient("resilience-test", client =>
                client.BaseAddress = new Uri("https://products.example"))
            .ConfigurePrimaryHttpMessageHandler(() => handler)
            .AddProductsApiResilience();
        return services.BuildServiceProvider();
    }

    private sealed class StubHandler(Func<int, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        public int Attempts { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Attempts++;
            return Task.FromResult(responseFactory(Attempts));
        }
    }
}
