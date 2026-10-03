import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Order, OrdersService } from '../../core/orders/orders.service';

@Component({
  selector: 'app-order-detail-page',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPage {
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);
  private readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.orderId) {
      this.loading.set(false);
      this.error.set('This order number is invalid.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.ordersService
      .get(this.orderId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.status === 404
              ? 'This order was not found in your account.'
              : error.error?.message ?? 'We could not load this order.',
          ),
      });
  }

  orderStatusClasses(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700';
      case 'processing':
      case 'shipped':
        return 'bg-blue-50 text-blue-700';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  }

  paymentStatusClasses(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700';
      case 'failed':
      case 'expired':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  }
}
