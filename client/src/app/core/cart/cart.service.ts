import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

export interface CartItem {
  productId: number;
  name: string | null;
  quantity: number;
  unitPriceAtAddition: number;
  currencyAtAddition: string;
  currentUnitPrice: number | null;
  currentCurrency: string | null;
  priceChanged: boolean;
  isAvailable: boolean;
  unavailableReason: string | null;
  lineTotal: number | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface Cart {
  version: string;
  items: CartItem[];
  totalQuantity: number;
  currency: string | null;
  subtotal: number | null;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/cart';
  private readonly cartState = signal<Cart | null>(null);

  readonly cart = this.cartState.asReadonly();
  readonly totalQuantity = computed(() => this.cartState()?.totalQuantity ?? 0);

  load(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl).pipe(tap((cart) => this.cartState.set(cart)));
  }

  add(productId: number, quantity = 1): Observable<Cart> {
    return this.load().pipe(
      switchMap((cart) => {
        const existingQuantity = cart.items.find((item) => item.productId === productId)?.quantity ?? 0;
        return this.setItem(productId, Math.min(existingQuantity + quantity, 99), cart.version);
      }),
    );
  }

  setItem(productId: number, quantity: number, version: string): Observable<Cart> {
    return this.http
      .put<Cart>(`${this.apiUrl}/items/${productId}`, { quantity, version })
      .pipe(tap((cart) => this.cartState.set(cart)));
  }

  removeItem(productId: number, version: string): Observable<Cart> {
    const params = new HttpParams().set('version', version);
    return this.http
      .delete<Cart>(`${this.apiUrl}/items/${productId}`, { params })
      .pipe(tap((cart) => this.cartState.set(cart)));
  }

  clear(version: string): Observable<Cart> {
    const params = new HttpParams().set('version', version);
    return this.http.delete<Cart>(this.apiUrl, { params }).pipe(tap((cart) => this.cartState.set(cart)));
  }

  reset(): void {
    this.cartState.set(null);
  }
}
