import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { Cart, CartService } from '../../core/cart/cart.service';
import { Product, ProductsService } from '../../core/products/products.service';
import { productImage } from '../../core/products/product-image';

@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  readonly cartService = inject(CartService);
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requestedProducts = new Set<number>();
  readonly productDetails = signal<ReadonlyMap<number, Product>>(new Map());
  readonly productImage = productImage;
  readonly loading = signal(true);
  readonly changingProductId = signal<number | null>(null);
  readonly clearing = signal(false);
  readonly error = signal('');
  readonly hasChanges = computed(() =>
    this.cartService.cart()?.items.some((item) => item.priceChanged || !item.isAvailable) ?? false,
  );

  constructor() {
    effect(() => {
      const items = this.cartService.cart()?.items ?? [];
      untracked(() => {
        for (const item of items) {
          if (this.requestedProducts.has(item.productId)) continue;
          this.requestedProducts.add(item.productId);
          this.productsService.getProduct(item.productId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (product) => this.productDetails.update((details) => new Map(details).set(item.productId, product)),
              error: () => undefined,
            });
        }
      });
    });
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
    if (!cart || this.changingProductId() !== null || this.clearing() || quantity < 1 || quantity > 99) return;

    this.changingProductId.set(productId);
    this.runMutation(
      this.cartService.setItem(productId, quantity, cart.version),
      () => this.changingProductId.set(null),
    );
  }

  remove(productId: number): void {
    const cart = this.cartService.cart();
    if (!cart || this.changingProductId() !== null || this.clearing()) return;

    this.changingProductId.set(productId);
    this.runMutation(this.cartService.removeItem(productId, cart.version), () => this.changingProductId.set(null));
  }

  clear(): void {
    const cart = this.cartService.cart();
    if (!cart || this.changingProductId() !== null || this.clearing()) return;

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
      this.cartService.load(true).subscribe({ error: () => undefined });
      return;
    }

    this.error.set(error.error?.message ?? 'We could not update your cart. Please try again.');
  }
}
