using ECommerce.Api;
using ECommerce.Api.Identity;
using ECommerce.Api.Products;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddSingleton<DownstreamTokenService>();

builder.Services
    .AddOptions<DownstreamTokenOptions>()
    .Bind(builder.Configuration.GetSection(DownstreamTokenOptions.SectionName))
    .Validate(DownstreamTokenOptions.IsValid, "DownstreamTokens configuration is invalid.")
    .ValidateOnStart();

builder.Services
    .AddOptions<ProductsApiOptions>()
    .Bind(builder.Configuration.GetSection(ProductsApiOptions.SectionName))
    .Validate(options => options.BaseUrl is { IsAbsoluteUri: true }, "ProductsApi:BaseUrl must be an absolute URL.")
    .Validate(options => !string.IsNullOrWhiteSpace(options.ApiKey), "ProductsApi:ApiKey is required.")
    .ValidateOnStart();

builder.Services.AddTransient<ProductsApiExceptionHandler>();
builder.Services.AddHttpClient("ProductsApiAuth", (serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProductsApiOptions>>().Value;
    client.BaseAddress = options.BaseUrl;
})
    .AddHttpMessageHandler<ProductsApiExceptionHandler>()
    .AddProductsApiResilience();
builder.Services.AddSingleton<ProductsApiTokenProvider>();
builder.Services.AddHttpClient<IProductsAuthApiClient, ProductsAuthApiClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProductsApiOptions>>().Value;
    client.BaseAddress = options.BaseUrl;
    client.Timeout = TimeSpan.FromSeconds(30);
})
    .AddHttpMessageHandler<ProductsApiExceptionHandler>();
builder.Services.AddHttpClient<IProductsApiClient, ProductsApiClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProductsApiOptions>>().Value;
    client.BaseAddress = options.BaseUrl;
})
    .AddHttpMessageHandler<ProductsApiExceptionHandler>()
    .AddProductsApiResilience();
builder.Services.AddHttpClient<ICartApiClient, CartApiClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProductsApiOptions>>().Value;
    client.BaseAddress = options.BaseUrl;
})
    .AddHttpMessageHandler<ProductsApiExceptionHandler>()
    .AddProductsApiResilience();
builder.Services.AddHttpClient<IAccountApiClient, AccountApiClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProductsApiOptions>>().Value;
    client.BaseAddress = options.BaseUrl;
})
    .AddHttpMessageHandler<ProductsApiExceptionHandler>()
    .AddProductsApiResilience();
builder.Services.AddHttpClient<ICustomerAddressesApiClient, CustomerAddressesApiClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<ProductsApiOptions>>().Value;
    client.BaseAddress = options.BaseUrl;
})
    .AddHttpMessageHandler<ProductsApiExceptionHandler>()
    .AddProductsApiResilience();

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "__Host-ecommerce-auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.Name = "__Host-ecommerce-antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});

builder.Services.AddCors(options =>
    options.AddPolicy("AngularDev", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    }));

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AngularDev");
app.UseAuthentication();
app.UseAuthorization();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
