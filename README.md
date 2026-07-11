# ECommerce

Angular + ASP.NET Core starter. The home route is intentionally empty; `/login` lazy-loads sign-in and registration forms.

Run `dotnet ef database update` then `dotnet run` in `server/ECommerce.Api`. Run `npm install` then `npm start` in `client`.

Authentication uses ASP.NET Core Identity cookies (`HttpOnly`, `Secure`, `SameSite=Strict`) and antiforgery protection. Identity roles are enabled for later RBAC.

## Development

This repository contains the Angular client and ASP.NET Core API in one workspace.
