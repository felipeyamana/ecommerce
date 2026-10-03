using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Reflection;
using System.Text.Json;
using ECommerce.Api.Contracts;
using ECommerce.Api.Controllers;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace ECommerce.Api.Tests;

public sealed class AuthValidationTests
{
    [Theory]
    [InlineData("ecommerceuser")]
    [InlineData("ECOMMERCEUSER1")]
    [InlineData("EcommerceUser")]
    [InlineData("Shop1")]
    public void RegistrationRejectsPasswordsThatDoNotMeetRequirements(string password)
    {
        var request = new RegisterRequest("shopper@example.com", password, password);
        var errors = new List<ValidationResult>();
        Assert.False(ValidatePassword(request, errors));
        Assert.Contains(errors, error => error.MemberNames.Contains(nameof(RegisterRequest.Password)));
    }

    [Theory]
    [InlineData("Password1")]
    [InlineData("Écommerce1")]
    public void RegistrationAcceptsValidPasswordsWithoutSpecialCharacters(string password)
    {
        var request = new RegisterRequest("shopper@example.com", password, password);
        Assert.True(ValidatePassword(request, []));
    }

    private static bool ValidatePassword(RegisterRequest request, List<ValidationResult> errors)
    {
        // MVC reads validation metadata from primary constructor parameters on records.
        var password = typeof(RegisterRequest).GetConstructors().Single()
            .GetParameters().Single(parameter => parameter.Name == nameof(RegisterRequest.Password));
        var context = new ValidationContext(request) { MemberName = nameof(RegisterRequest.Password) };
        return Validator.TryValidateValue(request.Password, context, errors, password.GetCustomAttributes<ValidationAttribute>());
    }

    [Fact]
    public async Task LoginForwardsDownstreamFailureWithoutCreatingSession()
    {
        var client = new FailingAuthClient();
        var controller = new AuthController(client, null!)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        var response = await controller.Login(new LoginRequest("shopper@example.com", "wrong"), CancellationToken.None);
        var result = Assert.IsType<JsonResult>(response);
        Assert.Equal((int)HttpStatusCode.Unauthorized, result.StatusCode);
        Assert.Equal("Invalid email or password.", Assert.IsType<JsonElement>(result.Value).GetProperty("message").GetString());
        Assert.Equal("shopper@example.com", client.Request!.Email);
        Assert.False(controller.User.Identity?.IsAuthenticated ?? false);
    }

    private sealed class FailingAuthClient : IProductsAuthApiClient
    {
        public LoginRequest? Request { get; private set; }
        public Task<ProductsAuthResult> RegisterAsync(RegisterRequest request, string clientIp, CancellationToken cancellationToken) =>
            throw new NotSupportedException();
        public Task<ProductsAuthResult> LoginAsync(LoginRequest request, string clientIp, CancellationToken cancellationToken)
        {
            Request = request;
            return Task.FromResult(ProductsAuthResult.Failure(401, JsonSerializer.SerializeToElement(new { message = "Invalid email or password." })));
        }
    }
}
