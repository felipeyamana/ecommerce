import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { Product, ProductsService } from '../../core/products/products.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './product-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage {
  private static readonly categoryImages: Record<number, string> = {
    1: 'electronics.png',
    2: 'other-electronics.png',
    3: 'mobile-phones.png',
    4: 'wearables.png',
    5: 'power-charging.png',
    6: 'computer-accessories.png',
    7: 'audio.png',
    8: 'laptops.png',
    9: 'tablets.png',
    10: 'tv-home-theater.png',
    11: 'cameras.png',
  };

  private readonly productsService = inject(ProductsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly addedToCart = signal(false);
  readonly addingToCart = signal(false);
  readonly cartError = signal('');
  readonly productId = Number(this.route.snapshot.paramMap.get('id'));

  constructor() {
    this.loadProduct();
  }

  categoryImage(subCategoryId: number | null): string {
    const image = (subCategoryId && ProductDetailPage.categoryImages[subCategoryId]) ?? ProductDetailPage.categoryImages[1];
    return `/category-placeholders/${image}`;
  }

  loadProduct(): void {
    if (!Number.isSafeInteger(this.productId) || this.productId < 1) {
      this.loading.set(false);
      this.error.set('This product could not be found.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.productsService
      .getProduct(this.productId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (product) => this.product.set(product),
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.status === 404
              ? 'This product could not be found.'
              : 'We could not load this product. Please try again.',
          ),
      });
  }

  addToCart(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.addingToCart.set(true);
    this.addedToCart.set(false);
    this.cartError.set('');
    this.cart
      .add(this.productId)
      .pipe(finalize(() => this.addingToCart.set(false)))
      .subscribe({
        next: () => this.addedToCart.set(true),
        error: (error: HttpErrorResponse) =>
          this.cartError.set(error.error?.message ?? 'We could not add this item. Please try again.'),
      });
  }
}
