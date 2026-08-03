import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((c) => c.HomePage) },
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
