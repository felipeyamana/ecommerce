import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthService, CurrentUser } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';
import { ProductsService } from './core/products/products.service';

describe('App', () => {
  const currentUser = signal<CurrentUser | null>(null);
  const initialized = signal(true);
  let loadCart: ReturnType<typeof vi.fn>;
  let resetCart: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    currentUser.set(null);
    loadCart = vi.fn(() => of({}));
    resetCart = vi.fn();
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
            displayName: () => currentUser()?.name ?? 'Test User',
            initialize: () => undefined,
            logout: () => of(undefined),
          },
        },
        {
          provide: CartService,
          useValue: {
            totalQuantity: () => 0,
            load: loadCart,
            reset: resetCart,
          },
        },
        {
          provide: ProductsService,
          useValue: { getCategories: () => of([]) },
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

  it('should render the account menu before the cart for an authenticated user', async () => {
    currentUser.set({ id: '1', email: 'test.user@example.com', name: 'Test User', roles: [] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const accountMenu = compiled.querySelector('.account-menu');
    const cart = compiled.querySelector('.cart-link');
    if (!accountMenu || !cart) throw new Error('Expected the account menu and cart link to render.');
    expect(accountMenu?.textContent).toContain('Hello, Test User');
    expect(accountMenu?.textContent).toContain('Orders');
    expect(accountMenu?.textContent).toContain('Addresses');
    expect(accountMenu.compareDocumentPosition(cart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(loadCart).toHaveBeenCalledOnce();
  });

  it('should clear cart state for an anonymous session', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(resetCart).toHaveBeenCalled();
  });
});
