import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import {
  Category,
  PagedProducts,
  Product,
  ProductCatalogQuery,
  ProductsService,
} from '../../core/products/products.service';

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
  readonly catalogQuery = signal<ProductCatalogQuery>({ page: 1, pageSize: 30, brands: [] });
  readonly categories = signal<readonly Category[]>([]);
  readonly categoriesLoading = signal(true);
  readonly categoriesError = signal(false);
  readonly brandSearch = signal('');
  readonly showAllBrands = signal(false);
  readonly minPriceDraft = signal('');
  readonly maxPriceDraft = signal('');
  readonly filterError = signal('');
  readonly addingProductId = signal<number | null>(null);
  readonly addedProductId = signal<number | null>(null);
  readonly cartError = signal('');
  readonly categoryGroups = computed(() =>
    this.categories()
      .filter((category) => category.parentCategoryId === null)
      .map((category) => ({
        ...category,
        children: this.categories().filter((child) => child.parentCategoryId === category.id),
      })),
  );
  readonly brandFacets = computed(() => {
    const selectedBrands = this.catalogQuery().brands ?? [];
    const apiFacets = this.products()?.facets.brands ?? [];
    const apiFacetsByBrand = new Map(
      apiFacets.map((facet) => [facet.brand.toLocaleLowerCase(), facet]),
    );
    const selectedKeys = new Set(selectedBrands.map((brand) => brand.toLocaleLowerCase()));
    const selectedFacets = selectedBrands.map((brand) => {
      const apiFacet = apiFacetsByBrand.get(brand.toLocaleLowerCase());
      return {
        brand: apiFacet?.brand ?? brand,
        count: apiFacet?.count ?? 0,
        selected: true,
        unavailable: apiFacet === undefined,
      };
    });
    const availableFacets = apiFacets
      .filter((facet) => !selectedKeys.has(facet.brand.toLocaleLowerCase()))
      .map((facet) => ({ ...facet, selected: false, unavailable: false }));

    return [...selectedFacets, ...availableFacets];
  });
  readonly filteredBrandFacets = computed(() => {
    const search = this.brandSearch().trim().toLocaleLowerCase();
    return this.brandFacets().filter(
      (facet) => facet.selected || !search || facet.brand.toLocaleLowerCase().includes(search),
    );
  });
  readonly visibleBrandFacets = computed(() => {
    const facets = this.filteredBrandFacets();
    if (this.showAllBrands()) return facets;

    const selectedFacets = facets.filter((facet) => facet.selected);
    const availableSlots = Math.max(0, 8 - selectedFacets.length);
    return [
      ...selectedFacets,
      ...facets.filter((facet) => !facet.selected).slice(0, availableSlots),
    ];
  });
  readonly hasMoreBrands = computed(() => {
    return this.filteredBrandFacets().length > this.visibleBrandFacets().length;
  });
  readonly activeFilterCount = computed(() => {
    const query = this.catalogQuery();
    return (
      (query.categoryId || query.subCategoryId ? 1 : 0) +
      (query.brands?.length ?? 0) +
      (query.minPrice === undefined ? 0 : 1) +
      (query.maxPrice === undefined ? 0 : 1) +
      (query.minRating === undefined ? 0 : 1)
    );
  });

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => this.parseCatalogQuery(params)),
        distinctUntilChanged(
          (previous, current) => JSON.stringify(previous) === JSON.stringify(current),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((query) => {
        this.catalogQuery.set(query);
        this.searchTerm.set(query.search ?? '');
        this.minPriceDraft.set(query.minPrice?.toString() ?? '');
        this.maxPriceDraft.set(query.maxPrice?.toString() ?? '');
        this.loadProducts(query);
      });
    this.loadCategories();
  }

  categoryImage(subCategoryId: number | null): string {
    const image =
      (subCategoryId && HomePage.categoryImages[subCategoryId]) ?? HomePage.categoryImages[1];
    return `/category-placeholders/${image}`;
  }

  loadPage(page: number): void {
    if (page < 1 || (this.products() && page > this.products()!.totalPages)) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page === 1 ? null : page },
      queryParamsHandling: 'merge',
    });
  }

  reload(): void {
    this.loadProducts(this.catalogQuery());
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

  selectCategory(category: Category | null): void {
    if (!category) {
      this.updateFilters({ categoryId: null, subCategoryId: null });
      return;
    }

    const isSubCategory = category.parentCategoryId !== null;
    this.updateFilters({
      categoryId: isSubCategory ? category.parentCategoryId : category.id,
      subCategoryId: isSubCategory ? category.id : null,
    });
  }

  isCategorySelected(category: Category): boolean {
    const query = this.catalogQuery();
    return category.parentCategoryId === null
      ? query.categoryId === category.id && query.subCategoryId === undefined
      : query.subCategoryId === category.id;
  }

  toggleBrand(brand: string, selected: boolean): void {
    const brands = [...(this.catalogQuery().brands ?? [])];
    const normalizedBrand = brand.toLocaleLowerCase();
    const existingIndex = brands.findIndex(
      (selectedBrand) => selectedBrand.toLocaleLowerCase() === normalizedBrand,
    );

    if (selected && existingIndex === -1) brands.push(brand);
    else if (!selected && existingIndex !== -1) brands.splice(existingIndex, 1);

    this.updateFilters({ brands: brands.length ? brands : null });
  }

  selectRating(minRating: number | null): void {
    this.updateFilters({ minRating });
  }

  updatePriceDraft(kind: 'min' | 'max', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (kind === 'min' ? this.minPriceDraft : this.maxPriceDraft).set(value);
  }

  applyPriceFilters(): void {
    const minPrice = this.parsePrice(this.minPriceDraft());
    const maxPrice = this.parsePrice(this.maxPriceDraft());
    if (minPrice === null || maxPrice === null) {
      this.filterError.set('Prices must be positive numbers.');
      return;
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      this.filterError.set('Minimum price cannot exceed maximum price.');
      return;
    }

    this.filterError.set('');
    this.updateFilters({ minPrice: minPrice ?? null, maxPrice: maxPrice ?? null });
  }

  clearFilters(): void {
    this.filterError.set('');
    this.brandSearch.set('');
    this.showAllBrands.set(false);
    this.updateFilters({
      categoryId: null,
      subCategoryId: null,
      brands: null,
      minPrice: null,
      maxPrice: null,
      minRating: null,
    });
  }

  private loadProducts(query: ProductCatalogQuery): void {
    this.loading.set(true);
    this.error.set('');

    this.productsService
      .getProducts(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => this.error.set('We could not load the products. Please try again.'),
      });
  }

  private updateFilters(filters: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...filters, page: null },
      queryParamsHandling: 'merge',
    });
  }

  private parseCatalogQuery(params: ParamMap): ProductCatalogQuery {
    const brands = params
      .getAll('brands')
      .flatMap((brand) => brand.split(','))
      .map((brand) => brand.trim())
      .filter(Boolean);

    return {
      page: this.positiveInteger(params.get('page')) ?? 1,
      pageSize: 30,
      search: params.get('search')?.trim() || undefined,
      categoryId: this.positiveInteger(params.get('categoryId')),
      subCategoryId: this.positiveInteger(params.get('subCategoryId')),
      brands,
      minPrice: this.nonNegativeNumber(params.get('minPrice')),
      maxPrice: this.nonNegativeNumber(params.get('maxPrice')),
      minRating: this.rating(params.get('minRating')),
      sort: params.get('sort')?.trim() || undefined,
    };
  }

  private positiveInteger(value: string | null): number | undefined {
    const parsed = Number(value);
    return value !== null && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private nonNegativeNumber(value: string | null): number | undefined {
    const parsed = Number(value);
    return value !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  private rating(value: string | null): number | undefined {
    const parsed = this.nonNegativeNumber(value);
    return parsed !== undefined && parsed <= 5 ? parsed : undefined;
  }

  private parsePrice(value: string): number | undefined | null {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  addToCart(product: Product): void {
    if (!product.isActive || product.currentPrice === null || this.addingProductId() !== null)
      return;

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
          this.cartError.set(
            error.error?.message ?? 'We could not add this item. Please try again.',
          ),
      });
  }
}
