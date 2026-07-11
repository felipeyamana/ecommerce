using ECommerce.Api.Data;
using ECommerce.Api.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers(); builder.Services.AddOpenApi();
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddIdentityCore<ApplicationUser>(options => { options.User.RequireUniqueEmail = true; options.Password.RequiredLength = 8; options.Password.RequireNonAlphanumeric = false; }).AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<ApplicationDbContext>().AddSignInManager();
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
builder.Services.ConfigureApplicationCookie(options => { options.Cookie.Name = "__Host-ecommerce-auth"; options.Cookie.HttpOnly = true; options.Cookie.SecurePolicy = CookieSecurePolicy.Always; options.Cookie.SameSite = SameSiteMode.Strict; options.SlidingExpiration = true; options.ExpireTimeSpan = TimeSpan.FromHours(8); options.Events = new CookieAuthenticationEvents { OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; }, OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; } }; });
builder.Services.AddAntiforgery(options => { options.HeaderName = "X-XSRF-TOKEN"; options.Cookie.Name = "XSRF-TOKEN"; options.Cookie.HttpOnly = false; options.Cookie.SecurePolicy = CookieSecurePolicy.Always; options.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddCors(options => options.AddPolicy("AngularDev", policy => policy.WithOrigins("https://localhost:4200", "http://localhost:4200").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build(); if (app.Environment.IsDevelopment()) app.MapOpenApi(); app.UseHttpsRedirection(); app.UseCors("AngularDev"); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); app.Run();
public partial class Program;
