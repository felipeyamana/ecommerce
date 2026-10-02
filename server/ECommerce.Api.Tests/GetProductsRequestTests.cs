using System.ComponentModel.DataAnnotations;
using ECommerce.Api.Products;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class GetProductsRequestTests
{
    [Fact]
    public void ToCatalogQuery_NormalizesTextBrandsAndSort()
    {
        var request = new GetProductsRequest
        {
            Search = "  headphones  ",
            Brands = [" Acme, SoundCo ", "acme", ""],
            Sort = " PRICE-ASC "
        };

        var query = request.ToCatalogQuery();

        Assert.Equal("headphones", query.Search);
        Assert.Equal(["Acme", "SoundCo"], query.Brands);
        Assert.Equal("price-asc", query.Sort);
    }

    [Fact]
    public void Validation_RejectsInvalidRanges()
    {
        var request = new GetProductsRequest
        {
            Page = 0,
            PageSize = 31,
            CategoryId = 0,
            SubCategoryId = -1,
            MinPrice = -1,
            MaxPrice = 10000000000000000m,
            MinRating = 6
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.Page)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.PageSize)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.CategoryId)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.SubCategoryId)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.MinPrice)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.MaxPrice)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.MinRating)));
    }

    [Fact]
    public void Validation_RejectsInvalidCrossFieldAndCatalogValues()
    {
        var request = new GetProductsRequest
        {
            Search = new string('a', 201),
            Brands = Enumerable.Range(1, 21).Select(index => $"Brand {index}").ToArray(),
            MinPrice = 20,
            MaxPrice = 10,
            Sort = "oldest"
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.Search)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.Brands)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.MinPrice)));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(GetProductsRequest.Sort)));
    }

    private static IReadOnlyList<ValidationResult> Validate(GetProductsRequest request)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(request, new ValidationContext(request), results, validateAllProperties: true);
        return results;
    }
}
