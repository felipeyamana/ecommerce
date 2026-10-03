import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CheckoutSession, Order, OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates an order from the selected address and current cart version', () => {
    const request = {
      addressId: '11111111-1111-1111-1111-111111111111',
      cartVersion: '22222222-2222-2222-2222-222222222222',
    };
    const order = { id: '33333333-3333-3333-3333-333333333333' } as Order;

    service.create(request).subscribe((created) => expect(created).toBe(order));

    const call = http.expectOne('/api/orders');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush(order);
  });

  it('loads an order and starts its checkout session', () => {
    const orderId = '33333333-3333-3333-3333-333333333333';
    const order = { id: orderId } as Order;
    const session = { orderId, sessionId: 'cs_test', clientSecret: 'cs_test_secret' } as CheckoutSession;

    service.get(orderId).subscribe((loaded) => expect(loaded).toBe(order));
    const get = http.expectOne(`/api/orders/${orderId}`);
    expect(get.request.method).toBe('GET');
    get.flush(order);

    service.createCheckoutSession(orderId).subscribe((created) => expect(created).toBe(session));
    const checkout = http.expectOne(`/api/orders/${orderId}/checkout`);
    expect(checkout.request.method).toBe('POST');
    expect(checkout.request.body).toBeNull();
    checkout.flush(session);
  });
});
