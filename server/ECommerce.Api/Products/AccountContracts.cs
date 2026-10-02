using System.ComponentModel.DataAnnotations;

namespace ECommerce.Api.Products;

public sealed record AccountProfileResponse(
    string Email,
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? PhoneRegionCode,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    byte[] Version);

public sealed record UpdateAccountProfileRequest(
    [MaxLength(100)] string? FirstName,
    [MaxLength(100)] string? LastName,
    [MaxLength(16), RegularExpression(
        @"^\+[1-9]\d{1,14}$",
        ErrorMessage = "Phone number must use E.164 format.")]
    string? PhoneNumber,
    [MinLength(2), MaxLength(2), RegularExpression(
        @"^[A-Za-z]{2}$",
        ErrorMessage = "Phone region code must be a two-letter ISO region code.")]
    string? PhoneRegionCode,
    [Required, MinLength(8), MaxLength(8)] byte[] Version)
    : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var hasPhoneNumber = !string.IsNullOrWhiteSpace(PhoneNumber);
        var hasRegionCode = !string.IsNullOrWhiteSpace(PhoneRegionCode);

        if (hasPhoneNumber == hasRegionCode)
        {
            yield break;
        }

        yield return new ValidationResult(
            "Phone number and phone region code must be provided together.",
            [nameof(PhoneNumber), nameof(PhoneRegionCode)]);
    }
}
