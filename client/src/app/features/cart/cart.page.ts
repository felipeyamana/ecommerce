import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { Cart, CartService } from '../../core/cart/cart.service';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  readonly cartService = inject(CartService);
  readonly loading = signal(true);
  readonly changingProductId = signal<number | null>(null);
  readonly clearing = signal(false);
  readonly error = signal('');
  readonly hasChanges = computed(() =>
    this.cartService.cart()?.items.some((item) => item.priceChanged || !item.isAvailable) ?? false,
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.cartService
      .load()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: (error) => this.handleError(error) });
  }

  changeQuantity(productId: number, quantity: number): void {
    const cart = this.cartService.cart();
    if (!cart || quantity < 1 || quantity > 99) return;

    this.changingProductId.set(productId);
    this.runMutation(
      this.cartService.setItem(productId, quantity, cart.version),
      () => this.changingProductId.set(null),
    );
  }

  remove(productId: number): void {
    const cart = this.cartService.cart();
    if (!cart) return;

    this.changingProductId.set(productId);
    this.runMutation(this.cartService.removeItem(productId, cart.version), () => this.changingProductId.set(null));
  }

  clear(): void {
    const cart = this.cartService.cart();
    if (!cart) return;

    this.clearing.set(true);
    this.runMutation(this.cartService.clear(cart.version), () => this.clearing.set(false));
  }

  private runMutation(request: Observable<Cart>, done: () => void): void {
    this.error.set('');
    request.pipe(finalize(done)).subscribe({ error: (error) => this.handleError(error) });
  }

  private handleError(error: HttpErrorResponse): void {
    if (error.status === 409) {
      this.error.set('Your cart changed in another request. We refreshed it for you.');
      this.cartService.load().subscribe({ error: () => undefined });
      return;
    }

    this.error.set(error.error?.message ?? 'We could not update your cart. Please try again.');
  }
}
