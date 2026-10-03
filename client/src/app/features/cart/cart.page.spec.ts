import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Cart, CartService } from '../../core/cart/cart.service';
import { ProductsService } from '../../core/products/products.service';
import { CartPage } from './cart.page';

describe('Cart page', () => {
  const initialCart: Cart = {
    version: 'version-1', totalQuantity: 1, currency: 'USD', subtotal: 50,
    items: [{
      productId: 42, name: 'Headphones', quantity: 1,
      unitPriceAtAddition: 50, currencyAtAddition: 'USD',
      currentUnitPrice: 50, currentCurrency: 'USD', priceChanged: false,
      isAvailable: true, unavailableReason: null, lineTotal: 50,
      createdAtUtc: '', updatedAtUtc: '',
    }],
  };
  const cart = signal<Cart>(initialCart);
  let getProduct: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    cart.set(initialCart);
    getProduct = vi.fn(() => of({
      id: 42,
      subCategoryId: 7,
      description: 'Wireless noise-cancelling headphones',
      currentPrice: 50,
      listPrice: 75,
      priceCurrencyCode: 'USD',
    }));
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: { cart, load: () => of(cart()) } },
        { provide: ProductsService, useValue: { getProduct } },
      ],
    }).compileComponents();
  });

  it('uses the catalog image and description without reloading details after quantity changes', () => {
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')?.getAttribute('src')).toBe('/category-placeholders/audio.png');
    expect(element.textContent).toContain('Wireless noise-cancelling headphones');
    expect(getProduct).toHaveBeenCalledWith(42);
    cart.set({ ...initialCart, totalQuantity: 2, items: [{ ...initialCart.items[0], quantity: 2 }] });
    fixture.detectChanges();
    expect(getProduct).toHaveBeenCalledTimes(1);
  });

  it('shows the effective unit price and the original price when the product is discounted', () => {
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.cart-current-price')?.textContent).toContain('$50.00 each');
    expect(element.querySelector('.cart-list-price')?.textContent).toContain('$75.00');
  });

  it('disables checkout navigation immediately and ignores repeated attempts', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockReturnValue(new Promise(() => undefined));
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('.checkout-button')!;

    button.click();
    fixture.detectChanges();
    button.click();

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Opening checkout…');
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/checkout']);
  });

  it('keeps the cart usable with a fallback image when product details cannot load', () => {
    getProduct.mockReturnValue(throwError(() => new Error('Product unavailable')));
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')?.getAttribute('src')).toBe('/category-placeholders/electronics.png');
    expect(element.textContent).toContain('Headphones');
    expect(fixture.componentInstance.error()).toBe('');
  });
});
