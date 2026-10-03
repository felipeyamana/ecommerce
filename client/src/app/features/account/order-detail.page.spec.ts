import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { OrderDetailPage } from './order-detail.page';

describe('Order detail page', () => {
  it('displays the order snapshot and every line item', async () => {
    const orderId = 'b0be42c7-5bbf-f111-a6a9-002248bcf7c4';
    await TestBed.configureTestingModule({
      imports: [OrderDetailPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: orderId }) } } },
      ],
    }).compileComponents();

    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrderDetailPage);
    http.expectOne(`/api/orders/${orderId}`).flush({
      id: orderId,
      status: 'Confirmed',
      customerEmail: 'shopper@example.com',
      shippingAddress: {
        recipientName: 'Test Shopper',
        phoneNumber: '+5511999999999',
        phoneRegionCode: 'BR',
        addressLine1: '1 Main Street',
        addressLine2: 'Apartment 2',
        city: 'São Paulo',
        region: 'SP',
        postalCode: '01000-000',
        countryCode: 'BR',
      },
      currencyCode: 'USD',
      subtotal: 50,
      discountTotal: 5,
      shippingTotal: 4,
      taxTotal: 1,
      grandTotal: 50,
      createdAtUtc: '2026-10-03T12:00:00Z',
      updatedAtUtc: '2026-10-03T12:05:00Z',
      items: [
        {
          productId: 42,
          productName: 'Headphones',
          productExternalId: 'HEAD-42',
          quantity: 2,
          unitPrice: 25,
          discountAmount: 5,
          lineTotal: 45,
        },
      ],
      paymentStatus: 'Paid',
      paidAtUtc: '2026-10-03T12:05:00Z',
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(`Order ${orderId}`);
    expect(element.textContent).toContain('Payment: Paid');
    expect(element.textContent).toContain('Headphones');
    expect(element.textContent).toContain('2 × $25.00');
    expect(element.textContent).toContain('Test Shopper');
    expect(element.textContent).toContain('$50.00');
    expect(element.querySelector<HTMLAnchorElement>('a[href="/products/42"]')).not.toBeNull();
    http.verify();
  });
});
