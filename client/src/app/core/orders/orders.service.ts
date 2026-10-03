import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateOrderRequest {
  addressId: string;
  cartVersion: string;
}

export interface OrderSummary {
  id: string;
  status: string;
  currencyCode: string;
  grandTotal: number;
  totalQuantity: number;
  createdAtUtc: string;
}

export interface PagedOrders {
  items: OrderSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface OrderShippingAddress {
  recipientName: string;
  phoneNumber: string | null;
  phoneRegionCode: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

export interface OrderItem {
  productId: number | null;
  productName: string;
  productExternalId: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: string;
  customerEmail: string;
  shippingAddress: OrderShippingAddress;
  currencyCode: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  items: OrderItem[];
  paymentStatus: string;
  paidAtUtc: string | null;
}

export interface CheckoutSession {
  orderId: string;
  sessionId: string;
  clientSecret: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/orders';

  list(page = 1, pageSize = 20): Observable<PagedOrders> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedOrders>(this.apiUrl, { params });
  }

  create(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, request);
  }

  get(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`);
  }

  createCheckoutSession(orderId: string): Observable<CheckoutSession> {
    return this.http.post<CheckoutSession>(`${this.apiUrl}/${orderId}/checkout`, null);
  }
}
