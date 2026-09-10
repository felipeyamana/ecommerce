import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';

describe('App', () => {
  const currentUser = signal(null);
  const initialized = signal(true);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            initialized: initialized.asReadonly(),
            isAuthenticated: () => currentUser() !== null,
            initialize: () => undefined,
            logout: () => of(undefined),
          },
        },
        {
          provide: CartService,
          useValue: {
            totalQuantity: () => 0,
            reset: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render authentication navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/login"]')?.textContent).toContain('Log in');
    expect(compiled.querySelector('a[href="/register"]')?.textContent).toContain('Sign up');
  });
});
