import { CurrencyPipe, DecimalPipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import { productImage } from '../../core/products/product-image';
import { FavoriteButton } from '../../core/favorites/favorite-button';
import { FavoritesService } from '../../core/favorites/favorites.service';
import {
  Category,
  PagedProducts,
  Product,
  ProductCatalogQuery,
  ProductsService,
} from '../../core/products/products.service';

@Component({
  selector: 'app-home-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, NgTemplateOutlet, FavoriteButton],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly productsService = inject(ProductsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);
  private priceTimer?: ReturnType<typeof setTimeout>;
  private requestVersion = 0;
  private readonly document = inject(DOCUMENT);
  private readonly filterDialog = viewChild.required<ElementRef<HTMLDialogElement>>('filterDialog');
  private previousBodyOverflow = '';
  readonly filterDrawerOpen = signal(false);

  openFilterDrawer(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.filterDrawerOpen.set(true);
    this.filterDialog().nativeElement.showModal();
  }

  closeFilterDrawer(): void {
    this.filterDialog().nativeElement.close();
    this.onFilterDrawerClosed();
  }

  onFilterDrawerClosed(): void {
    if (!this.filterDrawerOpen()) return;
    this.document.body.style.overflow = this.previousBodyOverflow;
    this.filterDrawerOpen.set(false);
  }

  showFilteredResults(): void {
    this.applyPriceFilters();
    if (!this.filterError()) this.closeFilterDrawer();
  }
  readonly viewStyle = signal<'grid' | 'list'>('grid');
  readonly sortOptions = [
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'rating-desc', label: 'Top rated' },
    { value: 'newest', label: 'Newest arrivals' },
  ];
  readonly selectedCategory = computed(() => this.categories().find(
    category => category.id === (this.catalogQuery().subCategoryId ?? this.catalogQuery().categoryId),
  ));
  readonly selectedParent = computed(() => this.categories().find(
    category => category.id === this.selectedCategory()?.parentCategoryId,
  ));
  readonly sliderMaximum = computed(() => Math.max(1,
    this.products()?.facets.maxPrice ?? 2000,
    this.catalogQuery().maxPrice ?? 0,
    this.catalogQuery().minPrice ?? 0,
  ));
  readonly sliderMin = computed(() => Math.min(this.sliderMaximum(), Math.max(0, Number(this.minPriceDraft()) || 0)));
  readonly sliderMax = computed(() => this.maxPriceDraft() === '' ? this.sliderMaximum() : Math.min(this.sliderMaximum(), Math.max(0, Number(this.maxPriceDraft()) || 0)));

  readonly products = signal<PagedProducts | null>(null);
  readonly favorites = inject(FavoritesService);
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
    this.destroyRef.onDestroy(() => clearTimeout(this.priceTimer));
    this.destroyRef.onDestroy(() => this.onFilterDrawerClosed());
    this.route.queryParamMap
      .pipe(
        map((params) => this.parseCatalogQuery(params)),
        distinctUntilChanged(
          (previous, current) => JSON.stringify(previous) === JSON.stringify(current),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((query) => {
        clearTimeout(this.priceTimer);
        this.catalogQuery.set(query);
        this.searchTerm.set(query.search ?? '');
        this.minPriceDraft.set(query.minPrice?.toString() ?? '');
        this.maxPriceDraft.set(query.maxPrice?.toString() ?? '');
        this.loadProducts(query);
      });
    this.loadCategories();
  }

  categoryImage(subCategoryId: number | null): string {
    return productImage(subCategoryId);
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
    clearTimeout(this.priceTimer);
    this.priceTimer = setTimeout(() => this.applyPriceFilters(), 600);
  }

  updatePriceSlider(kind: 'min' | 'max', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const constrained = kind === 'min' ? Math.min(value, this.sliderMax()) : Math.max(value, this.sliderMin());
    (kind === 'min' ? this.minPriceDraft : this.maxPriceDraft).set(constrained.toString());
    clearTimeout(this.priceTimer);
  }

  beginPriceSliderInteraction(): void {
    clearTimeout(this.priceTimer);
  }

  finishPriceSliderInteraction(): void {
    clearTimeout(this.priceTimer);
    this.priceTimer = setTimeout(() => this.applyPriceFilters(), 400);
  }

  selectSort(event: Event): void {
    this.updateFilters({ sort: (event.target as HTMLSelectElement).value });
  }

  categoryIcon(category: Category): string {
    const name = category.name.toLowerCase();
    if (/audio|headphone/.test(name)) return 'M5 14v-3a7 7 0 0 1 14 0v3 M5 12H3v7h4v-7H5 M19 12h2v7h-4v-7h2';
    if (/laptop|computer/.test(name)) return 'M5 4h14v12H5z M2 20h20l-3-4H5z';
    if (/phone|tablet|mobile/.test(name)) return 'M7 2h10v20H7z M10 18h4';
    if (/wear|watch/.test(name)) return 'M8 6V2h8v4 M8 18v4h8v-4 M6 6h12v12H6z';
    if (/power|charg/.test(name)) return 'M13 2 4 14h7l-1 8 10-13h-7z';
    if (/camera|photo/.test(name)) return 'M3 7h5l2-3h4l2 3h5v13H3z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0';
    if (/gaming/.test(name)) return 'M7 7h10l4 12h-4l-3-3h-4l-3 3H3z M6 11h5 M8.5 8.5v5 M16 11h.01 M18 13h.01';
    if (/storage|memory/.test(name)) return 'M5 3h14v18H5z M8 6h8 M8 17h.01 M12 17h4';
    return 'M3 4h18v13H3z M8 21h8 M12 17v4';
  }

  applyPriceFilters(): void {
    clearTimeout(this.priceTimer);
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
    if (minPrice === this.catalogQuery().minPrice && maxPrice === this.catalogQuery().maxPrice) return;
    this.updateFilters({ minPrice: minPrice ?? null, maxPrice: maxPrice ?? null });
  }

  clearFilters(): void {
    clearTimeout(this.priceTimer);
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
    const version = ++this.requestVersion;
    this.loading.set(true);
    this.error.set('');

    this.productsService
      .getProducts(query)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { if (version === this.requestVersion) this.loading.set(false); }))
      .subscribe({
        next: (products) => { if (version === this.requestVersion) this.products.set(products); },
        error: () => { if (version === this.requestVersion) this.error.set('We could not load the products. Please try again.'); },
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
