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

  getProducts(page = 1, pageSize = 30, search?: string) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    const requestParams = search ? params.set('search', search) : params;
    return this.http.get<PagedProducts>(this.apiUrl, { params: requestParams });
  }

  getProduct(id: number) {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getCategories(refresh = false): Observable<readonly Category[]> {
    if (refresh || !this.categoriesRequest) {
      this.categoriesRequest = this.http.get<Category[]>(this.categoriesUrl).pipe(
        tap({ error: () => (this.categoriesRequest = undefined) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.categoriesRequest;
  }
}
