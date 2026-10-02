using System.ComponentModel.DataAnnotations;

namespace ECommerce.Api.Contracts;

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password,
    bool RememberMe = false);

public sealed record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8), RegularExpression(
        @"^(?=[\s\S]*\p{Ll})(?=[\s\S]*\p{Lu})(?=[\s\S]*\p{Nd})[\s\S]+$",
        ErrorMessage = "Password must contain a lowercase letter, an uppercase letter, and a number.")]
    string Password,
    [Required] string ConfirmPassword);

public sealed record CurrentUserResponse(
    Guid Id,
    string Email,
    IReadOnlyCollection<string> Roles);
