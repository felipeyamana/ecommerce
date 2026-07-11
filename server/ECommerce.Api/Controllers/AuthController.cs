using ECommerce.Api.Contracts;
using ECommerce.Api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
namespace ECommerce.Api.Controllers;
[ApiController, Route("api/[controller]")]
public sealed class AuthController(UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn, IAntiforgery antiforgery) : ControllerBase {
 [HttpGet("csrf")] public IActionResult Csrf() { var tokens = antiforgery.GetAndStoreTokens(HttpContext); Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions { HttpOnly = false, Secure = true, SameSite = SameSiteMode.Strict, Path = "/" }); return NoContent(); }
 [HttpPost("register"), ValidateAntiForgeryToken] public async Task<IActionResult> Register(RegisterRequest request) { if (request.Password != request.ConfirmPassword) return BadRequest(new { message = "Passwords do not match." }); var user = new ApplicationUser { UserName = request.Email.Trim(), Email = request.Email.Trim() }; var result = await users.CreateAsync(user, request.Password); if (!result.Succeeded) return ValidationProblem(result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description })); await signIn.SignInAsync(user, false); return NoContent(); }
 [HttpPost("login"), ValidateAntiForgeryToken] public async Task<IActionResult> Login(LoginRequest request) { var user = await users.FindByEmailAsync(request.Email.Trim()); if (user is null) return Unauthorized(new { message = "Invalid email or password." }); var result = await signIn.PasswordSignInAsync(user, request.Password, request.RememberMe, true); return result.Succeeded ? NoContent() : Unauthorized(new { message = "Invalid email or password." }); }
 [Authorize, HttpPost("logout"), ValidateAntiForgeryToken] public async Task<IActionResult> Logout() { await signIn.SignOutAsync(); return NoContent(); }
 [Authorize, HttpGet("me")] public async Task<ActionResult<CurrentUserResponse>> Me() { var user = await users.GetUserAsync(User); if (user is null) return Unauthorized(); return Ok(new CurrentUserResponse(user.Id, user.Email!, await users.GetRolesAsync(user))); }
}
