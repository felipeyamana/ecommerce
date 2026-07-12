import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/products';

  getProducts(page = 1, pageSize = 30) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedProducts>(this.apiUrl, { params });
  }

  getProduct(id: number) {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
}
