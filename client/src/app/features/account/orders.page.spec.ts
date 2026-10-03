import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrdersPage } from './orders.page';

describe('Orders page', () => {
  it('displays the current customer order history', async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrdersPage);
    http.expectOne('/api/orders?page=1&pageSize=10').flush({
      items: [
        {
          id: 'b0be42c7-5bbf-f111-a6a9-002248bcf7c4',
          status: 'Confirmed',
          currencyCode: 'USD',
          grandTotal: 831.6,
          totalQuantity: 3,
          createdAtUtc: '2026-10-03T12:00:00Z',
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('b0be42c7-5bbf-f111-a6a9-002248bcf7c4');
    expect(element.textContent).toContain('Confirmed');
    expect(element.textContent).toContain('3');
    expect(element.textContent).toContain('$831.60');
    http.verify();
  });
});
