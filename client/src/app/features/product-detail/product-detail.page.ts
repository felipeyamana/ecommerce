import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
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

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly addedToCart = signal(false);
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
    this.addedToCart.set(true);
  }
}
