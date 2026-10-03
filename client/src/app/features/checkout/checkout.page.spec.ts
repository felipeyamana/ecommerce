import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AddressesService, CustomerAddress } from '../../core/account/addresses.service';
import { Cart, CartService } from '../../core/cart/cart.service';
import { Order, OrdersService } from '../../core/orders/orders.service';
import { StripeCheckoutService } from '../../core/payments/stripe-checkout.service';
import { CheckoutPage } from './checkout.page';

describe('CheckoutPage', () => {
  const home: CustomerAddress = {
    id: '11111111-1111-1111-1111-111111111111',
    label: 'Home',
    recipientName: 'Alex Shopper',
    phoneNumber: null,
    addressLine1: '100 Main Street',
    addressLine2: null,
    city: 'Seattle',
    region: 'WA',
    postalCode: '98101',
    countryCode: 'US',
    isDefault: true,
    createdAtUtc: '2026-01-01T12:00:00Z',
    updatedAtUtc: '2026-01-01T12:00:00Z',
    version: 'AAAAAAAAAAA=',
  };
  const cartVersion = '22222222-2222-2222-2222-222222222222';
  const initialCart: Cart = {
    version: cartVersion,
    totalQuantity: 1,
    currency: 'USD',
    subtotal: 50,
    items: [{
      productId: 42,
      name: 'Headphones',
      quantity: 1,
      unitPriceAtAddition: 50,
      currencyAtAddition: 'USD',
      currentUnitPrice: 50,
      currentCurrency: 'USD',
      priceChanged: false,
      isAvailable: true,
      unavailableReason: null,
      lineTotal: 50,
      createdAtUtc: '',
      updatedAtUtc: '',
    }],
  };
  const order = {
    id: '33333333-3333-3333-3333-333333333333',
    currencyCode: 'USD',
    grandTotal: 50,
  } as Order;

  const cartState = signal<Cart | null>(initialCart);
  const addressesState = signal<CustomerAddress[]>([home]);
  let create: ReturnType<typeof vi.fn>;
  let createCheckoutSession: ReturnType<typeof vi.fn>;
  let getOrder: ReturnType<typeof vi.fn>;
  let mountStripe: ReturnType<typeof vi.fn>;
  let reset: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    cartState.set(initialCart);
    addressesState.set([home]);
    create = vi.fn(() => of(order));
    createCheckoutSession = vi.fn(() => of({
      orderId: order.id,
      sessionId: 'cs_test',
      clientSecret: 'cs_test_secret',
    }));
    getOrder = vi.fn(() => of({ ...order, paymentStatus: 'Paid' }));
    mountStripe = vi.fn(() => Promise.resolve());
    reset = vi.fn(() => cartState.set(null));

    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            cart: cartState.asReadonly(),
            load: vi.fn(() => of(cartState()!)),
            reset,
          },
        },
        {
          provide: AddressesService,
          useValue: {
            addresses: addressesState.asReadonly(),
            load: vi.fn(() => of(addressesState())),
          },
        },
        {
          provide: OrdersService,
          useValue: { create, createCheckoutSession, get: getOrder },
        },
        {
          provide: StripeCheckoutService,
          useValue: { mount: mountStripe, destroy: vi.fn() },
        },
      ],
    })
      .overrideComponent(CheckoutPage, {
        remove: { providers: [StripeCheckoutService] },
      })
      .compileComponents();
  });

  it('selects the default address, creates an order, and mounts embedded checkout', async () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.selectedAddressId()).toBe(home.id);
    expect(component.canCreateOrder()).toBe(true);

    component.createOrder();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(create).toHaveBeenCalledWith({ addressId: home.id, cartVersion });
    expect(createCheckoutSession).toHaveBeenCalledWith(order.id);
    expect(mountStripe).toHaveBeenCalledWith('cs_test_secret', expect.any(HTMLElement), expect.any(Function));
    expect(reset).toHaveBeenCalledOnce();
    expect(component.createdOrder()).toBe(order);
    expect(component.paymentState()).toBe('ready');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Secure payment');

    const onComplete = mountStripe.mock.calls[0][2] as () => void;
    onComplete();
    await vi.waitFor(() => expect(component.paymentState()).toBe('paid'));
    fixture.detectChanges();

    expect(getOrder).toHaveBeenCalledWith(order.id);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thank you for your order');
  });

  it('blocks order creation while the cart has changes to review', () => {
    cartState.set({
      ...initialCart,
      items: [{ ...initialCart.items[0], priceChanged: true }],
    });
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.cartNeedsReview()).toBe(true);
    expect(fixture.componentInstance.canCreateOrder()).toBe(false);

    fixture.componentInstance.createOrder();

    expect(create).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Review cart');
  });
});
