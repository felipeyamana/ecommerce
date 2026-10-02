import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { PagedProducts, Product, ProductsService } from '../../core/products/products.service';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<PagedProducts | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly searchTerm = signal('');
  readonly addingProductId = signal<number | null>(null);
  readonly addedProductId = signal<number | null>(null);
  readonly cartError = signal('');

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => (params.get('search') ?? '').trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((search) => {
        this.searchTerm.set(search);
        this.loadPage(1);
      });
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
      .getProducts(page, 30, this.searchTerm() || undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.error.set('We could not load the products. Please try again.'),
      });
  }

  addToCart(product: Product): void {
    if (!product.isActive || product.currentPrice === null || this.addingProductId() !== null) return;

    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.addingProductId.set(product.id);
    this.addedProductId.set(null);
    this.cartError.set('');
    this.cart
      .add(product.id)
      .pipe(finalize(() => this.addingProductId.set(null)))
      .subscribe({
        next: () => this.addedProductId.set(product.id),
        error: (error: HttpErrorResponse) =>
          this.cartError.set(error.error?.message ?? 'We could not add this item. Please try again.'),
      });
  }
}
