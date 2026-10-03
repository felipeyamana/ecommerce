import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AddressesService, CreateCustomerAddress, CustomerAddress } from './addresses.service';

describe('AddressesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('returns the newly created address after refreshing the shared address list', () => {
    const service = TestBed.inject(AddressesService);
    const http = TestBed.inject(HttpTestingController);
    const request: CreateCustomerAddress = {
      label: 'Home',
      recipientName: 'Alex Shopper',
      phoneNumber: null,
      addressLine1: '100 Main Street',
      addressLine2: null,
      city: 'Seattle',
      region: 'WA',
      postalCode: '98101',
      countryCode: 'US',
      isDefault: true,
    };
    const created: CustomerAddress = {
      ...request,
      id: '11111111-1111-1111-1111-111111111111',
      createdAtUtc: '2026-10-03T12:00:00Z',
      updatedAtUtc: '2026-10-03T12:00:00Z',
      version: 'AAAAAAAAAAA=',
    };
    let result: CustomerAddress | undefined;

    service.create(request).subscribe((address) => (result = address));
    http.expectOne('/api/addresses').flush(created);
    http.expectOne('/api/addresses').flush([created]);

    expect(result).toBe(created);
    expect(service.addresses()).toEqual([created]);
    http.verify();
  });
});
