using System.ComponentModel.DataAnnotations;

namespace ECommerce.Api.Contracts;

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password,
    bool RememberMe = false);

public sealed record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string ConfirmPassword);

public sealed record CurrentUserResponse(
    Guid Id,
    string Email,
    IReadOnlyCollection<string> Roles);
