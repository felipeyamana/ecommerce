import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';
import {
  Category,
  PagedProducts,
  Product,
  ProductsService,
} from '../../core/products/products.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  const product: Product = {
    id: 42,
    name: 'Wireless headphones',
    brand: 'Acme',
    description: 'Noise-cancelling headphones',
    categoryId: 1,
    categoryName: 'Electronics',
    subCategoryId: 7,
    subCategoryName: 'Audio',
    externalProductId: null,
    averageRating: 4.5,
    totalRatings: 20,
    isActive: true,
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
    currentPrice: 99.99,
    listPrice: 129.99,
    priceCurrencyCode: 'USD',
  };
  const products: PagedProducts = {
    items: [product],
    pageNumber: 1,
    pageSize: 30,
    totalCount: 1,
    totalPages: 1,
    facets: {
      minPrice: 99.99,
      maxPrice: 99.99,
      brands: [{ brand: 'Acme', count: 1 }],
      ratings: [{ minRating: 4, count: 1 }],
    },
  };
  const categories: Category[] = [
    { id: 1, name: 'Electronics', parentCategoryId: null },
    { id: 7, name: 'Audio', parentCategoryId: 1 },
  ];

  let getProducts: ReturnType<typeof vi.fn>;
  let add: ReturnType<typeof vi.fn>;
  let isAuthenticated: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getProducts = vi.fn(() => of(products));
    add = vi.fn(() => of({}));
    isAuthenticated = vi.fn(() => true);

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
        {
          provide: ProductsService,
          useValue: { getProducts, getCategories: vi.fn(() => of(categories)) },
        },
        {
          provide: AuthService,
          useValue: { isAuthenticated },
        },
        {
          provide: CartService,
          useValue: { add },
        },
      ],
    }).compileComponents();
  });

  it('adds a product to the cart from its catalog card', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    fixture.componentInstance.addToCart(product);
    fixture.detectChanges();

    expect(add).toHaveBeenCalledWith(product.id);
    expect(fixture.componentInstance.addedProductId()).toBe(product.id);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Added to cart');
  });

  it('redirects signed-out customers to login without changing the cart', () => {
    isAuthenticated.mockReturnValue(false);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    fixture.componentInstance.addToCart(product);

    expect(add).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('renders category, brand, and rating filters from API data', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Electronics');
    expect(text).toContain('Audio');
    expect(text).toContain('Acme');
    expect(text).toContain('& up');
  });

  it('opens both filter groups in the drawer and restores scrolling on close', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector<HTMLDialogElement>('#catalog-filter-drawer')!;
    const showModal = vi.fn();
    const close = vi.fn();
    Object.defineProperty(dialog, 'showModal', { value: showModal });
    Object.defineProperty(dialog, 'close', { value: close });
    const originalOverflow = document.body.style.overflow;
    element.querySelector<HTMLButtonElement>('[aria-controls="catalog-filter-drawer"]')!.click();
    fixture.detectChanges();
    expect(showModal).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog.querySelector('[aria-label="Product categories"]')).not.toBeNull();
    expect(dialog.querySelector('[aria-label="Product filters"]')).not.toBeNull();
    expect(element.querySelectorAll('#filter-min-price')).toHaveLength(1);
    dialog.querySelector<HTMLButtonElement>('[aria-label="Close filters"]')!.click();
    fixture.detectChanges();
    expect(close).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe(originalOverflow);
    expect(fixture.componentInstance.filterDrawerOpen()).toBe(false);
    fixture.destroy();
  });

  it('writes brand filters to the URL and resets pagination', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    fixture.componentInstance.toggleBrand('Acme', true);

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { brands: ['Acme'], page: null },
      queryParamsHandling: 'merge',
    });
  });

  it('debounces price edits and applies them immediately on blur without a duplicate request', () => {
    vi.useFakeTimers();
    try {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const fixture = TestBed.createComponent(HomePage);
      fixture.detectChanges();
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#filter-min-price')!;
      input.value = '10';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(400);
      expect(navigate).not.toHaveBeenCalled();
      input.value = '20';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(599);
      expect(navigate).not.toHaveBeenCalled();
      input.dispatchEvent(new Event('blur'));
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { minPrice: 20, maxPrice: null, page: null } }));
      vi.advanceTimersByTime(1000);
      expect(navigate).toHaveBeenCalledTimes(1);
      fixture.destroy();
    } finally { vi.useRealTimers(); }
  });

  it('waits 400 ms after release and cancels when the slider is picked up again', () => {
    vi.useFakeTimers();
    try {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const fixture = TestBed.createComponent(HomePage);
      fixture.detectChanges();
      const slider = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('[aria-label="Minimum price slider"]')!;
      slider.value = '20';
      slider.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(2000);
      expect(fixture.componentInstance.minPriceDraft()).toBe('20');
      expect(navigate).not.toHaveBeenCalled();
      slider.dispatchEvent(new Event('change'));
      vi.advanceTimersByTime(399);
      expect(navigate).not.toHaveBeenCalled();
      slider.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(1000);
      expect(navigate).not.toHaveBeenCalled();
      slider.value = '25';
      slider.dispatchEvent(new Event('input'));
      slider.dispatchEvent(new Event('change'));
      vi.advanceTimersByTime(399);
      expect(navigate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { minPrice: 25, maxPrice: null, page: null } }));
      expect(navigate).toHaveBeenCalledTimes(1);
      fixture.destroy();
    } finally { vi.useRealTimers(); }
  });

  it('changes sorting through the URL and switches the listing to list view', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector<HTMLSelectElement>('#catalog-sort')!;
    select.value = 'price-asc';
    select.dispatchEvent(new Event('change'));
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { sort: 'price-asc', page: null } }));
    element.querySelector<HTMLButtonElement>('[aria-label="List view"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('[aria-label="Product listing"]')?.classList.contains('list-view')).toBe(true);
    expect(element.querySelector('[aria-label="List view"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a selected brand visible when the current category has no matching products', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    fixture.componentInstance.catalogQuery.set({
      page: 1,
      pageSize: 30,
      categoryId: 1,
      subCategoryId: 8,
      brands: ['Apple'],
    });
    fixture.componentInstance.products.set({
      ...products,
      items: [],
      totalCount: 0,
      facets: {
        ...products.facets,
        brands: [{ brand: 'Dell', count: 12 }],
      },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleBrandFacets()[0]).toEqual({
      brand: 'Apple',
      count: 0,
      selected: true,
      unavailable: true,
    });
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Apple');
    expect(text).toContain('No matches');
    expect(text).toContain('Dell');
  });
});
