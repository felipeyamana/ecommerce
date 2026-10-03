import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { OrdersService, PagedOrders } from '../../core/orders/orders.service';

@Component({
  selector: 'app-orders-page',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './orders.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {
  private readonly ordersService = inject(OrdersService);
  private readonly pageSize = 10;

  readonly orders = signal<PagedOrders | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.load(1);
  }

  load(page: number): void {
    const current = this.orders();
    if (page < 1 || (current && current.totalPages > 0 && page > current.totalPages)) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.ordersService
      .list(page, this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (orders) => this.orders.set(orders),
        error: (error: HttpErrorResponse) =>
          this.error.set(error.error?.message ?? 'We could not load your orders.'),
      });
  }

  statusClasses(status: string): string {
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
}
