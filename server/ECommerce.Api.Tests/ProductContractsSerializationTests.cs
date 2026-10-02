using System.Text.Json;
using ECommerce.Api.Products;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class ProductContractsSerializationTests
{
    [Fact]
    public void PagedProductsResponse_DeserializesProductsApiPayload()
    {
        const string json = """
            {
              "items": [],
              "pageNumber": 1,
              "pageSize": 30,
              "totalCount": 12,
              "totalPages": 1,
              "facets": {
                "minPrice": 10.50,
                "maxPrice": 99.99,
                "brands": [{ "brand": "Acme", "count": 4 }],
                "ratings": [{ "minRating": 4, "count": 7 }]
              }
            }
            """;

        var response = JsonSerializer.Deserialize<PagedProductsResponse>(
            json,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(response);
        Assert.Equal(12, response.TotalCount);
        Assert.Equal(10.50m, response.Facets.MinPrice);
        Assert.Equal("Acme", Assert.Single(response.Facets.Brands).Brand);
        Assert.Equal(4m, Assert.Single(response.Facets.Ratings).MinRating);
    }
}
