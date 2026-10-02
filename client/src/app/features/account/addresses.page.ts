import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import {
  AddressesService,
  CreateCustomerAddress,
  CustomerAddress,
  UpdateCustomerAddress,
} from '../../core/account/addresses.service';

@Component({
  selector: 'app-addresses-page',
  imports: [ReactiveFormsModule],
  templateUrl: './addresses.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressesPage {
  private readonly fb = inject(FormBuilder);
  readonly addressService = inject(AddressesService);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly changingAddressId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly editingAddressId = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = this.fb.nonNullable.group({
    label: ['', Validators.maxLength(50)],
    recipientName: ['', [Validators.required, Validators.maxLength(200)]],
    addressLine1: ['', [Validators.required, Validators.maxLength(200)]],
    addressLine2: ['', Validators.maxLength(200)],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    region: ['', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', [Validators.required, Validators.maxLength(30)]],
    countryCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    isDefault: false,
  });

  constructor() {
    this.load();
  }

  load(refresh = false): void {
    this.loading.set(true);
    this.error.set('');

    this.addressService
      .load(refresh)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ error: (error: HttpErrorResponse) => this.handleError(error, 'We could not load your addresses.') });
  }

  startAdd(): void {
    this.editingAddressId.set(null);
    this.pendingDeleteId.set(null);
    this.form.reset({
      label: '',
      recipientName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      countryCode: '',
      isDefault: this.addressService.addresses().length === 0,
    });
    this.formOpen.set(true);
    this.clearMessages();
  }

  startEdit(address: CustomerAddress): void {
    this.editingAddressId.set(address.id);
    this.pendingDeleteId.set(null);
    this.form.reset({
      label: address.label ?? '',
      recipientName: address.recipientName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      isDefault: address.isDefault,
    });
    this.formOpen.set(true);
    this.clearMessages();
  }

  cancelForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.editingAddressId.set(null);
    this.form.reset();
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const editingId = this.editingAddressId();
    const values = this.form.getRawValue();
    const baseAddress = {
      label: this.optional(values.label),
      recipientName: values.recipientName.trim(),
      addressLine1: values.addressLine1.trim(),
      addressLine2: this.optional(values.addressLine2),
      city: values.city.trim(),
      region: values.region.trim(),
      postalCode: values.postalCode.trim(),
      countryCode: values.countryCode.trim().toUpperCase(),
    };

    let request: Observable<CustomerAddress[]>;
    let successMessage: string;

    if (editingId) {
      const currentAddress = this.findAddress(editingId);
      if (!currentAddress) {
        this.error.set('This address is no longer available. Reload the page and try again.');
        return;
      }

      const update: UpdateCustomerAddress = {
        ...baseAddress,
        phoneNumber: currentAddress.phoneNumber,
        version: currentAddress.version,
      };
      request = this.addressService.update(editingId, update);
      successMessage = 'Your address has been updated.';
    } else {
      const create: CreateCustomerAddress = { ...baseAddress, phoneNumber: null, isDefault: values.isDefault };
      request = this.addressService.create(create);
      successMessage = 'Your address has been added.';
    }

    this.saving.set(true);
    this.clearMessages();
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.editingAddressId.set(null);
        this.success.set(successMessage);
      },
      error: (error: HttpErrorResponse) => this.handleMutationError(error, 'We could not save your address.'),
    });
  }

  setDefault(address: CustomerAddress): void {
    if (address.isDefault || this.isBusy()) return;

    this.changingAddressId.set(address.id);
    this.clearMessages();
    this.addressService
      .setDefault(address.id, address.version)
      .pipe(finalize(() => this.changingAddressId.set(null)))
      .subscribe({
        next: () => this.success.set(`${address.label || address.recipientName} is now your default address.`),
        error: (error: HttpErrorResponse) => this.handleMutationError(error, 'We could not change your default address.'),
      });
  }

  requestRemove(address: CustomerAddress): void {
    if (this.isBusy()) return;
    this.pendingDeleteId.set(address.id);
    this.clearMessages();
  }

  cancelRemove(): void {
    this.pendingDeleteId.set(null);
  }

  remove(address: CustomerAddress): void {
    if (this.isBusy()) return;

    this.changingAddressId.set(address.id);
    this.clearMessages();
    this.addressService
      .remove(address.id, address.version)
      .pipe(finalize(() => this.changingAddressId.set(null)))
      .subscribe({
        next: () => {
          this.pendingDeleteId.set(null);
          this.success.set('The address has been removed.');
        },
        error: (error: HttpErrorResponse) => this.handleMutationError(error, 'We could not remove your address.'),
      });
  }

  isBusy(): boolean {
    return this.saving() || this.changingAddressId() !== null;
  }

  private findAddress(addressId: string): CustomerAddress | undefined {
    return this.addressService.addresses().find((address) => address.id === addressId);
  }

  private optional(value: string): string | null {
    const normalized = value.trim();
    return normalized || null;
  }

  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }

  private handleMutationError(error: HttpErrorResponse, fallback: string): void {
    if (error.status === 409) {
      this.error.set('This address changed in another session. We refreshed your addresses; please try again.');
      this.addressService.load(true).subscribe({ error: () => undefined });
      return;
    }

    this.handleError(error, fallback);
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    this.error.set(error.error?.message ?? fallback);
  }
}
