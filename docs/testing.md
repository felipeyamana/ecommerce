# Test scope

Full API integration tests are limited to critical flows: successful login,
registration/session/logout, and a shared authentication/antiforgery smoke test.
Add order/checkout integration coverage when those endpoints are implemented.
`AuthTests` is tagged with `Category=Integration` and shares one application host;
each case uses its own client and cookies.

Use focused validation, service, serialization, and HTTP-handler tests for
meaningful behaviour. Do not add controller result tests that merely assert
forwarded payloads or status codes, or boot the API for every password rule or
CRUD operation. The shared security smoke test covers representative protected
routes.

Resilience tests retain the production retry count and circuit-breaker settings,
but override retry delays in their own service provider. Production delays are
unchanged.

Run all server tests:

```powershell
dotnet test ECommerce.slnx --configuration Release
```

Run only the cheaper tests or only integration tests:

```powershell
dotnet test ECommerce.slnx --configuration Release --filter "Category!=Integration"
dotnet test ECommerce.slnx --configuration Release --filter "Category=Integration"
```
