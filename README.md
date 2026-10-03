# ECommerce

An educational ecommerce storefront built with Angular and ASP.NET Core. It uses
a backend-for-frontend (BFF) to keep the browser-facing session separate from the
downstream [Products API][products-api] and currently supports the catalog, customer accounts,
saved addresses, favourites, carts, orders, and Stripe Embedded Checkout.

> [!WARNING]
> **This is a learning project, not a turnkey ecommerce platform.** Running the
> complete application requires substantial configuration outside this repository,
> including a separately configured [Products API][products-api], matching signing keys, Azure
> resources and networking rules, a database, and Stripe checkout/webhook setup.
> Cloning this repository and supplying one connection string is not enough. The
> code and setup notes are published primarily to demonstrate and discuss the
> architecture—not as a reusable, production-ready store.

## Architecture

```text
Browser
  |
  | same-origin cookies + antiforgery header
  v
Angular application + ASP.NET Core BFF (this repository)
  |
  | short-lived, signed downstream JWTs
  v
Products API (separate repository/deployment)
  |                         ^
  |                         | signed webhook events
  +--> SQL Server / Redis   +-- Stripe
```

The downstream API is maintained separately in
[`felipeyamana/products-api`][products-api].

In production, the ASP.NET Core application serves the compiled Angular files as
well as the `/api` BFF endpoints. During development, Angular runs on port `4200`
and proxies `/api` requests to `https://localhost:7264`.

## Current functionality

- Product browsing, filtering, search, and product details
- Registration, login, logout, and customer profile management
- Saved delivery addresses with default-address and concurrency handling
- Favourites and persistent customer carts
- Order creation from a versioned cart snapshot
- Stripe Embedded Checkout with server-created Checkout Sessions
- Paginated order history and order details
- Responsive Angular UI with guarded account routes

## Technology

- Angular 21, TypeScript, RxJS, Tailwind CSS, and Vitest
- ASP.NET Core 10 BFF with cookie authentication and antiforgery protection
- Short-lived RSA-signed JWTs for calls from the BFF to the [Products API][products-api]
- Stripe.js Embedded Checkout
- GitHub Actions deployment to Azure App Service

## Repository layout

```text
client/                         Angular application
server/ECommerce.Api/          ASP.NET Core BFF and production static-file host
server/ECommerce.Api.Tests/    BFF unit and integration tests
docs/                           Supporting project notes
.github/workflows/deploy.yml   Build, test, package, and Azure deployment workflow
```

## Local development

> [!IMPORTANT]
> The steps below only start this repository. A compatible [Products API][products-api] must
> already be running and configured. Checkout additionally requires Stripe test
> credentials and a working signed-webhook route. Consult the [Products API's][products-api]
> setup and migration documentation before troubleshooting this client.

### Prerequisites

- .NET 10 SDK
- Node.js 22 and npm
- A trusted ASP.NET Core development HTTPS certificate
- A running, compatible [Products API][products-api]
- Stripe CLI and a Stripe test account when exercising checkout locally

Trust the local HTTPS certificate if necessary:

```powershell
dotnet dev-certs https --trust
```

### Configure the BFF

The BFF reads the following configuration sections:

| Setting | Purpose |
| --- | --- |
| `ProductsApi:BaseUrl` | HTTPS base URL of the [Products API][products-api] |
| `ProductsApi:ApiKey` | API key accepted by the [Products API][products-api] token endpoint |
| `ProductsApi:Subject` | Service identity used for application-level API tokens |
| `DownstreamTokens:Issuer` | Issuer accepted by the [Products API][products-api] |
| `DownstreamTokens:Audience` | Audience accepted by the [Products API][products-api] |
| `DownstreamTokens:LifetimeMinutes` | Lifetime of customer-scoped downstream tokens |
| `DownstreamTokens:PrivateKey` | Base64 PKCS#8 RSA private key used by this BFF |
| `DownstreamTokens:KeyId` | Identifier of the matching public key in the [Products API][products-api] |

Keep private values outside source control. For local development, place them in
.NET User Secrets for `server/ECommerce.Api`. The [Products API][products-api] must trust the
matching public RSA key and use compatible issuer, audience, role, and scope
settings.

The committed `appsettings.json` contains only the configuration shape and local
defaults; it is not a complete working environment.

### Configure Stripe

The browser requires a Stripe **publishable** key. It is currently configured in
`client/src/app/core/payments/stripe-checkout.service.ts`.

Only publishable keys (`pk_test_...` or `pk_live_...`) may be included in browser
code. Stripe secret keys (`sk_...`) and webhook signing secrets (`whsec_...`) belong
only in the [Products API's][products-api] private configuration.

For a complete checkout flow, the [Products API][products-api] must be configured with:

- A Stripe server API key for the same test or live environment
- The signing secret for the deployed webhook destination
- Its Stripe payment database migration
- A publicly reachable `/api/payments/stripe/webhook` endpoint
- Handling for the checkout completion, asynchronous success/failure, and expiry
  events used by the [Products API][products-api]

Stripe webhook delivery is authoritative for confirming payment. A successful
payment in Stripe does not update an order if the webhook cannot reach the Products
API or fails signature validation.

### Run the server

From the repository root:

```powershell
dotnet restore ECommerce.slnx
dotnet run --project server/ECommerce.Api --launch-profile https
```

The HTTPS endpoint is `https://localhost:7264`. If startup reports that this
address is already in use, another server instance is already listening on that
port; use the existing instance or stop it before launching another one.

### Run the client

In a second terminal:

```powershell
cd client
npm ci
npm start
```

Open `http://localhost:4200`. The development proxy forwards `/api` requests to
the local BFF while preserving its cookie-based authentication flow.

## Tests and builds

Run the server tests from the repository root:

```powershell
dotnet test ECommerce.slnx --configuration Release
```

Run the client tests and production build:

```powershell
cd client
npm test -- --watch=false
npm run build
```

See [`docs/testing.md`](docs/testing.md) for the server test categories and scope.

## Security model

- Authentication uses a `Secure`, `HttpOnly`, `SameSite=Strict` host cookie.
- State-changing BFF routes require a matching antiforgery cookie and header.
- The browser never receives the [Products API][products-api] signing key or Stripe server key.
- The BFF derives short-lived downstream JWT subjects from the authenticated
  session; the [Products API][products-api] enforces customer ownership in its database queries.
- Public order and address identifiers are GUIDs, but authorization does not rely
  on their unpredictability.

These controls reduce common risks but do not constitute a security audit. Before
handling real customer or payment data, the application would still require threat
modeling, dependency and secret scanning, monitoring, rate limiting, operational
hardening, recovery procedures, and an independent security review.

## Azure deployment notes

The included GitHub Actions workflow builds both applications, runs their tests,
packages the Angular output into the ASP.NET Core application's `wwwroot`, and
deploys the package to Azure App Service using workload identity federation.

It expects these GitHub environment secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_WEBAPP_NAME`

The Azure App Service also needs the BFF settings listed above, normally expressed
as environment variables with double underscores, such as
`ProductsApi__BaseUrl` and `DownstreamTokens__PrivateKey`.

> [!CAUTION]
> Azure access restrictions must allow the ECommerce App Service to call the
> [Products API][products-api]. They must also allow Stripe's documented webhook source addresses
> to reach the [Products API][products-api] webhook endpoint. If Stripe receives `403 Forbidden`,
> payment can complete at Stripe while the local order remains pending. Keep webhook
> signature verification enabled even when network allowlists are used.

Azure resources, federated credentials, App Service settings, [Products API][products-api]
deployment, database/Redis infrastructure, Stripe destinations, DNS, certificates,
and production observability are intentionally not provisioned by this repository.

## License

This project is available under the [MIT License](LICENSE).

[products-api]: https://github.com/felipeyamana/products-api

