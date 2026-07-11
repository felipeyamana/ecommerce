using ECommerce.Api.Contracts;
using ECommerce.Api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace ECommerce.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet("csrf")]
    public IActionResult Csrf()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);

        Response.Cookies.Append(
            "XSRF-TOKEN",
            tokens.RequestToken!,
            new CookieOptions
            {
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = "/"
            });

        return NoContent();
    }

    [HttpPost("register")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
        {
            return BadRequest(new { message = "Passwords do not match." });
        }

        var email = request.Email.Trim();
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email
        };

        var result = await users.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem(ModelState);
        }

        await signIn.SignInAsync(user, isPersistent: false);
        return NoContent();
    }

    [HttpPost("login")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var result = await signIn.PasswordSignInAsync(
            user,
            request.Password,
            request.RememberMe,
            lockoutOnFailure: true);

        return result.Succeeded
            ? NoContent()
            : Unauthorized(new { message = "Invalid email or password." });
    }

    [Authorize]
    [HttpPost("logout")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await signIn.SignOutAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var user = await users.GetUserAsync(User);

        if (user is null)
        {
            return Unauthorized();
        }

        var roles = await users.GetRolesAsync(user);
        return Ok(new CurrentUserResponse(user.Id, user.Email!, roles.ToArray()));
    }
}
