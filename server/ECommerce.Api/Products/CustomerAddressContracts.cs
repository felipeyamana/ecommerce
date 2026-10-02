using System.ComponentModel.DataAnnotations;

namespace ECommerce.Api.Products;

public sealed record CustomerAddressResponse(
    Guid Id,
    string? Label,
    string RecipientName,
    string? PhoneNumber,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string Region,
    string PostalCode,
    string CountryCode,
    bool IsDefault,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    byte[] Version);

public sealed record CreateCustomerAddressRequest(
    [MaxLength(50)] string? Label,
    [Required, MaxLength(200)] string RecipientName,
    [MaxLength(32)] string? PhoneNumber,
    [Required, MaxLength(200)] string AddressLine1,
    [MaxLength(200)] string? AddressLine2,
    [Required, MaxLength(100)] string City,
    [Required, MaxLength(100)] string Region,
    [Required, MaxLength(30)] string PostalCode,
    [Required, RegularExpression("^[A-Za-z]{2}$")] string CountryCode,
    bool IsDefault = false);

public sealed record UpdateCustomerAddressRequest(
    [MaxLength(50)] string? Label,
    [Required, MaxLength(200)] string RecipientName,
    [MaxLength(32)] string? PhoneNumber,
    [Required, MaxLength(200)] string AddressLine1,
    [MaxLength(200)] string? AddressLine2,
    [Required, MaxLength(100)] string City,
    [Required, MaxLength(100)] string Region,
    [Required, MaxLength(30)] string PostalCode,
    [Required, RegularExpression("^[A-Za-z]{2}$")] string CountryCode,
    [Required, MinLength(8), MaxLength(8)] byte[] Version);

public sealed record SetDefaultCustomerAddressRequest(
    [Required, MinLength(8), MaxLength(8)] byte[] Version);
