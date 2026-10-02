import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, of, shareReplay, switchMap, tap } from 'rxjs';

export interface CustomerAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phoneNumber: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
  version: string;
}

export interface CreateCustomerAddress {
  label: string | null;
  recipientName: string;
  phoneNumber: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

export interface UpdateCustomerAddress extends Omit<CreateCustomerAddress, 'isDefault'> {
  version: string;
}

@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/addresses';
  private readonly addressesState = signal<CustomerAddress[]>([]);
  private loadRequest: Observable<CustomerAddress[]> | null = null;
  private loaded = false;

  readonly addresses = this.addressesState.asReadonly();

  load(refresh = false): Observable<CustomerAddress[]> {
    if (!refresh && this.loaded) return of(this.addressesState());
    if (this.loadRequest) return this.loadRequest;

    const request = this.http.get<CustomerAddress[]>(this.apiUrl).pipe(
      tap((addresses) => {
        this.addressesState.set(addresses);
        this.loaded = true;
      }),
      finalize(() => {
        if (this.loadRequest === request) this.loadRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.loadRequest = request;
    return request;
  }

  create(address: CreateCustomerAddress): Observable<CustomerAddress[]> {
    return this.http.post<CustomerAddress>(this.apiUrl, address).pipe(switchMap(() => this.load(true)));
  }

  update(addressId: string, address: UpdateCustomerAddress): Observable<CustomerAddress[]> {
    return this.http.put<CustomerAddress>(`${this.apiUrl}/${addressId}`, address).pipe(switchMap(() => this.load(true)));
  }

  setDefault(addressId: string, version: string): Observable<CustomerAddress[]> {
    return this.http
      .put<CustomerAddress>(`${this.apiUrl}/${addressId}/default`, { version })
      .pipe(switchMap(() => this.load(true)));
  }

  remove(addressId: string, version: string): Observable<CustomerAddress[]> {
    const params = new HttpParams().set('version', version);
    return this.http.delete<void>(`${this.apiUrl}/${addressId}`, { params }).pipe(switchMap(() => this.load(true)));
  }
}
