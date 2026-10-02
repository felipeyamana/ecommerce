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
