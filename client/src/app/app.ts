import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';
import { Category, ProductsService } from './core/products/products.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly loggingOut = signal(false);
  readonly announcement = signal('');
  readonly categories = signal<readonly Category[]>([]);
  readonly categoriesLoading = signal(true);
  readonly categoriesError = signal(false);
  readonly searchQuery = signal('');
  readonly categoryGroups = computed(() =>
    this.categories()
      .filter((category) => category.parentCategoryId === null)
      .map((category) => ({
        ...category,
        children: this.categories().filter((child) => child.parentCategoryId === category.id),
      })),
  );

  closeCategories(event: FocusEvent, menu: HTMLDetailsElement): void {
    if (!(event.relatedTarget instanceof Node) || !menu.contains(event.relatedTarget)) {
      menu.open = false;
    }
  }

  showComingSoon(feature: string): void {
    this.announcement.set(`${feature} is coming soon. You can browse all products in the meantime.`);
  }

  search(event: Event, query: string): void {
    event.preventDefault();
    const search = query.trim();
    void this.router.navigate(['/'], { queryParams: { search: search || null } });
  }

  constructor() {
    this.auth.initialize();
    this.syncSearchQuery();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncSearchQuery());
    this.loadCategories();
  }

  loadCategories(refresh = false): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(false);
    this.productsService
      .getCategories(refresh)
      .pipe(finalize(() => this.categoriesLoading.set(false)))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.categoriesError.set(true),
      });
  }

  logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().pipe(finalize(() => this.loggingOut.set(false))).subscribe({
      next: () => this.cart.reset(),
    });
  }

  private syncSearchQuery(): void {
    const search = this.router.parseUrl(this.router.url).queryParams['search'];
    this.searchQuery.set(typeof search === 'string' ? search : '');
  }
}
