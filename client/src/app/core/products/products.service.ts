import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  brand: string | null;
  description: string | null;
  categoryId: number;
  categoryName: string;
  subCategoryId: number | null;
  subCategoryName: string | null;
  externalProductId: string | null;
  averageRating: number | null;
  totalRatings: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentPrice: number | null;
  listPrice: number | null;
  priceCurrencyCode: string | null;
}

export interface PagedProducts {
  items: Product[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  facets: ProductFacets;
}

export interface ProductFacets {
  minPrice: number | null;
  maxPrice: number | null;
  brands: ProductBrandFacet[];
  ratings: ProductRatingFacet[];
}

export interface ProductBrandFacet {
  brand: string;
  count: number;
}

export interface ProductRatingFacet {
  minRating: number;
  count: number;
}

export interface ProductCatalogQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  subCategoryId?: number;
  brands?: readonly string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
}

export interface Category {
  id: number;
  name: string;
  parentCategoryId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/products';
  private readonly categoriesUrl = '/api/categories';
  private categoriesRequest?: Observable<readonly Category[]>;

  getProducts(query: ProductCatalogQuery = {}) {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 30);

    params = this.setIfPresent(params, 'search', query.search);
    params = this.setIfPresent(params, 'categoryId', query.categoryId);
    params = this.setIfPresent(params, 'subCategoryId', query.subCategoryId);
    params = this.setIfPresent(params, 'minPrice', query.minPrice);
    params = this.setIfPresent(params, 'maxPrice', query.maxPrice);
    params = this.setIfPresent(params, 'minRating', query.minRating);
    params = this.setIfPresent(params, 'sort', query.sort);

    for (const brand of query.brands ?? []) {
      params = params.append('brands', brand);
    }

    return this.http.get<PagedProducts>(this.apiUrl, { params });
  }

  getProduct(id: number) {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getCategories(refresh = false): Observable<readonly Category[]> {
    if (refresh || !this.categoriesRequest) {
      this.categoriesRequest = this.http
        .get<Category[]>(this.categoriesUrl)
        .pipe(
          tap({ error: () => (this.categoriesRequest = undefined) }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.categoriesRequest;
  }

  private setIfPresent(
    params: HttpParams,
    name: string,
    value: string | number | undefined,
  ): HttpParams {
    return value === undefined || value === '' ? params : params.set(name, value);
  }
}
