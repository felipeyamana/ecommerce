import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  AddressesService,
  CreateCustomerAddress,
  CustomerAddress,
  UpdateCustomerAddress,
} from '../../core/account/addresses.service';
import { AddressesPage } from './addresses.page';
import { AddressFormComponent } from '../../shared/address-form/address-form.component';

describe('AddressesPage', () => {
  const home: CustomerAddress = {
    id: '11111111-1111-1111-1111-111111111111',
    label: 'Home',
    recipientName: 'Alex Shopper',
    phoneNumber: '+1 555 0100',
    addressLine1: '100 Main Street',
    addressLine2: null,
    city: 'Seattle',
    region: 'WA',
    postalCode: '98101',
    countryCode: 'US',
    isDefault: true,
    createdAtUtc: '2026-01-01T12:00:00Z',
    updatedAtUtc: '2026-01-01T12:00:00Z',
    version: 'AAAAAAAAAAA=',
  };
  const work: CustomerAddress = {
    ...home,
    id: '22222222-2222-2222-2222-222222222222',
    label: 'Work',
    addressLine1: '200 Market Street',
    isDefault: false,
    version: 'AQAAAAAAAAA=',
  };

  const addressesState = signal<CustomerAddress[]>([]);
  let load: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let setDefault: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    addressesState.set([home, work]);
    load = vi.fn(() => of(addressesState()));
    create = vi.fn((_request: CreateCustomerAddress) => of(addressesState()));
    update = vi.fn((_addressId: string, _request: UpdateCustomerAddress) => of(addressesState()));
    setDefault = vi.fn((_addressId: string, _version: string) => of(addressesState()));
    remove = vi.fn((_addressId: string, _version: string) => of(addressesState()));

    await TestBed.configureTestingModule({
      imports: [AddressesPage],
      providers: [
        {
          provide: AddressesService,
          useValue: {
            addresses: addressesState.asReadonly(),
            load,
            create,
            update,
            setDefault,
            remove,
          },
        },
      ],
    }).compileComponents();
  });

  it('loads and displays saved addresses with default controls on every card', () => {
    const fixture = TestBed.createComponent(AddressesPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(load).toHaveBeenCalledOnce();
    expect(text).toContain('Home');
    expect(text).toContain('Work');
    expect(text).toContain('Default address');
    expect(text).toContain('Set as default');
  });

  it('adds a normalized address', () => {
    const fixture = TestBed.createComponent(AddressesPage);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.startAdd();
    fixture.detectChanges();
    const addressForm = fixture.debugElement.query(By.directive(AddressFormComponent))
      .componentInstance as AddressFormComponent;
    addressForm.form.setValue({
      label: '  Family  ',
      recipientName: '  Sam Shopper  ',
      addressLine1: '  300 Pine Street  ',
      addressLine2: '  Unit 4  ',
      city: '  Portland  ',
      region: '  OR  ',
      postalCode: '  97201  ',
      countryCode: 'us',
      isDefault: false,
    });

    addressForm.submit();

    expect(create).toHaveBeenCalledWith({
      label: 'Family',
      recipientName: 'Sam Shopper',
      phoneNumber: null,
      addressLine1: '300 Pine Street',
      addressLine2: 'Unit 4',
      city: 'Portland',
      region: 'OR',
      postalCode: '97201',
      countryCode: 'US',
      isDefault: false,
    });
    expect(component.success()).toBe('Your address has been added.');
  });

  it('sets a non-default address as default with its current version', () => {
    const fixture = TestBed.createComponent(AddressesPage);
    fixture.detectChanges();

    fixture.componentInstance.setDefault(work);

    expect(setDefault).toHaveBeenCalledWith(work.id, work.version);
  });
});
