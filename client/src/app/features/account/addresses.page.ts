import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize, Observable } from 'rxjs';
import { AddressesService, CustomerAddress } from '../../core/account/addresses.service';
import {
  AddressFormComponent,
  AddressFormSubmission,
} from '../../shared/address-form/address-form.component';

@Component({
  selector: 'app-addresses-page',
  imports: [AddressFormComponent],
  templateUrl: './addresses.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressesPage {
  readonly addressService = inject(AddressesService);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly changingAddressId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly editingAddressId = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editingAddress = computed(() => {
    const addressId = this.editingAddressId();
    return addressId
      ? this.addressService.addresses().find((address) => address.id === addressId) ?? null
      : null;
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
    this.formOpen.set(true);
    this.clearMessages();
  }

  startEdit(address: CustomerAddress): void {
    this.editingAddressId.set(address.id);
    this.pendingDeleteId.set(null);
    this.formOpen.set(true);
    this.clearMessages();
  }

  cancelForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.editingAddressId.set(null);
  }

  save(submission: AddressFormSubmission): void {
    if (this.saving()) return;

    let request: Observable<unknown>;
    let successMessage: string;

    if (submission.kind === 'update') {
      request = this.addressService.update(submission.addressId, submission.request);
      successMessage = 'Your address has been updated.';
    } else {
      request = this.addressService.create(submission.request);
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
