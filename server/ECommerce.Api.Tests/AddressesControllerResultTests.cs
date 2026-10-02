using System.Security.Claims;
using ECommerce.Api.Controllers;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class AddressesControllerResultTests
{
    private static readonly CustomerAddressResponse Address = new(
        Guid.NewGuid(),
        "Home",
        "Alex Shopper",
        null,
        "100 Main Street",
        null,
        "Seattle",
        "WA",
        "98101",
        "US",
        true,
        DateTime.UtcNow.AddMonths(-1),
        DateTime.UtcNow,
        new byte[8]);

    [Fact]
    public async Task Create_ForwardsCreatedResponseAndAuthenticatedUser()
    {
        var client = new StubAddressesApiClient();
        var controller = CreateController(client);
        var request = new CreateCustomerAddressRequest(
            "Home",
            "Alex Shopper",
            null,
            "100 Main Street",
            null,
            "Seattle",
            "WA",
            "98101",
            "US",
            true);

        var response = await controller.Create(request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        Assert.Same(Address, objectResult.Value);
        Assert.Same(request, client.CreateRequest);
        Assert.Equal("customer-id", client.Subject);
    }

    [Fact]
    public async Task SetDefault_ForwardsExpectedConflictWithoutThrowing()
    {
        var client = new StubAddressesApiClient
        {
            SetDefaultResult = DownstreamApiResult<CustomerAddressResponse>.Failure(
                StatusCodes.Status409Conflict,
                "The address changed in another request.")
        };
        var controller = CreateController(client);

        var response = await controller.SetDefault(
            Address.Id,
            new SetDefaultCustomerAddressRequest(Address.Version),
            CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
    }

    [Fact]
    public async Task Delete_ReturnsDownstreamNoContentStatus()
    {
        var client = new StubAddressesApiClient();
        var controller = CreateController(client);

        var response = await controller.Delete(
            Address.Id,
            Convert.ToBase64String(Address.Version),
            CancellationToken.None);

        var statusResult = Assert.IsType<StatusCodeResult>(response);
        Assert.Equal(StatusCodes.Status204NoContent, statusResult.StatusCode);
    }

    private static AddressesController CreateController(ICustomerAddressesApiClient client)
    {
        var controller = new AddressesController(client);
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

    private sealed class StubAddressesApiClient : ICustomerAddressesApiClient
    {
        public string? Subject { get; private set; }
        public CreateCustomerAddressRequest? CreateRequest { get; private set; }

        public DownstreamApiResult<CustomerAddressResponse> SetDefaultResult { get; init; } =
            DownstreamApiResult<CustomerAddressResponse>.Success(Address, StatusCodes.Status200OK);

        public Task<DownstreamApiResult<IReadOnlyList<CustomerAddressResponse>>> GetAllAsync(
            ClaimsPrincipal user,
            CancellationToken cancellationToken) =>
            Task.FromResult(DownstreamApiResult<IReadOnlyList<CustomerAddressResponse>>.Success(
                [Address],
                StatusCodes.Status200OK));

        public Task<DownstreamApiResult<CustomerAddressResponse>> CreateAsync(
            ClaimsPrincipal user,
            CreateCustomerAddressRequest request,
            CancellationToken cancellationToken)
        {
            Subject = user.FindFirstValue(ClaimTypes.NameIdentifier);
            CreateRequest = request;
            return Task.FromResult(DownstreamApiResult<CustomerAddressResponse>.Success(
                Address,
                StatusCodes.Status201Created));
        }

        public Task<DownstreamApiResult<CustomerAddressResponse>> UpdateAsync(
            ClaimsPrincipal user,
            Guid addressId,
            UpdateCustomerAddressRequest request,
            CancellationToken cancellationToken) =>
            Task.FromResult(DownstreamApiResult<CustomerAddressResponse>.Success(
                Address,
                StatusCodes.Status200OK));

        public Task<DownstreamApiResult<CustomerAddressResponse>> SetDefaultAsync(
            ClaimsPrincipal user,
            Guid addressId,
            SetDefaultCustomerAddressRequest request,
            CancellationToken cancellationToken) =>
            Task.FromResult(SetDefaultResult);

        public Task<DownstreamApiResult> DeleteAsync(
            ClaimsPrincipal user,
            Guid addressId,
            string version,
            CancellationToken cancellationToken) =>
            Task.FromResult(DownstreamApiResult.Success(StatusCodes.Status204NoContent));
    }
}
