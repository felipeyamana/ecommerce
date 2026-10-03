import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'favourites', canActivate: [authGuard], loadComponent: () => import('./features/favorites/favorites.page').then(c => c.FavoritesPage) },
  { path: '', loadComponent: () => import('./features/home/home.page').then((c) => c.HomePage) },
  {
    path: 'cart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cart/cart.page').then((c) => c.CartPage),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout.page').then((c) => c.CheckoutPage),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account.page').then((c) => c.AccountPage),
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/order-detail.page').then((c) => c.OrderDetailPage),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/orders.page').then((c) => c.OrdersPage),
  },
  {
    path: 'addresses',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/addresses.page').then((c) => c.AddressesPage),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/product-detail/product-detail.page').then((c) => c.ProductDetailPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((c) => c.LoginPage),
    data: { mode: 'login' },
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/login.page').then((c) => c.LoginPage),
    data: { mode: 'register' },
  },
  { path: '**', redirectTo: '' },
];
