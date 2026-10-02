using System.Security.Claims;
using ECommerce.Api.Controllers;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class AccountControllerResultTests
{
    private static readonly AccountProfileResponse Profile = new(
        "shopper@example.com",
        "Alex",
        "Shopper",
        "+15550100",
        "US",
        DateTime.UtcNow.AddYears(-1),
        DateTime.UtcNow,
        new byte[8]);

    [Fact]
    public async Task Get_ReturnsSuccessfulProfileWithoutResultWrapper()
    {
        var client = new StubAccountApiClient
        {
            GetResult = DownstreamApiResult<AccountProfileResponse>.Success(
                Profile,
                StatusCodes.Status200OK)
        };
        var controller = CreateController(client);

        var response = await controller.Get(CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status200OK, objectResult.StatusCode);
        Assert.Same(Profile, objectResult.Value);
        Assert.Equal("customer-id", client.Subject);
    }

    [Fact]
    public async Task Update_ForwardsExpectedConflictWithoutThrowing()
    {
        var client = new StubAccountApiClient
        {
            UpdateResult = DownstreamApiResult<AccountProfileResponse>.Failure(
                StatusCodes.Status409Conflict,
                "The customer profile changed in another request.")
        };
        var controller = CreateController(client);
        var request = new UpdateAccountProfileRequest("Alex", "Shopper", null, null, new byte[8]);

        var response = await controller.Update(request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        Assert.Same(request, client.UpdateRequest);
    }

    private static AccountController CreateController(IAccountApiClient client)
    {
        var controller = new AccountController(client);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(
                    new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "customer-id")], "test"))
            }
        };
        return controller;
    }

    private sealed class StubAccountApiClient : IAccountApiClient
    {
        public string? Subject { get; private set; }
        public UpdateAccountProfileRequest? UpdateRequest { get; private set; }

        public DownstreamApiResult<AccountProfileResponse> GetResult { get; init; } =
            DownstreamApiResult<AccountProfileResponse>.Success(Profile, StatusCodes.Status200OK);

        public DownstreamApiResult<AccountProfileResponse> UpdateResult { get; init; } =
            DownstreamApiResult<AccountProfileResponse>.Success(Profile, StatusCodes.Status200OK);

        public Task<DownstreamApiResult<AccountProfileResponse>> GetAsync(
            ClaimsPrincipal user,
            CancellationToken cancellationToken)
        {
            Subject = user.FindFirstValue(ClaimTypes.NameIdentifier);
            return Task.FromResult(GetResult);
        }

        public Task<DownstreamApiResult<AccountProfileResponse>> UpdateAsync(
            ClaimsPrincipal user,
            UpdateAccountProfileRequest request,
            CancellationToken cancellationToken)
        {
            Subject = user.FindFirstValue(ClaimTypes.NameIdentifier);
            UpdateRequest = request;
            return Task.FromResult(UpdateResult);
        }
    }
}
