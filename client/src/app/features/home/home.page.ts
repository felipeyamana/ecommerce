import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PagedProducts, ProductsService } from '../../core/products/products.service';

@Component({
  selector: 'app-home-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
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

  readonly products = signal<PagedProducts | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.loadPage(1);
  }

  categoryImage(subCategoryId: number | null): string {
    const image = (subCategoryId && HomePage.categoryImages[subCategoryId]) ?? HomePage.categoryImages[1];
    return `/category-placeholders/${image}`;
  }

  loadPage(page: number): void {
    if (page < 1 || (this.products() && page > this.products()!.totalPages)) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.productsService
      .getProducts(page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.error.set('We could not load the products. Please try again.'),
      });
  }
}
