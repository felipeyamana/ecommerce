import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateCustomerAddress,
  CustomerAddress,
  UpdateCustomerAddress,
} from '../../core/account/addresses.service';

export type AddressFormSubmission =
  | { kind: 'create'; request: CreateCustomerAddress }
  | { kind: 'update'; addressId: string; request: UpdateCustomerAddress };

@Component({
  selector: 'app-address-form',
  imports: [ReactiveFormsModule],
  templateUrl: './address-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly address = input<CustomerAddress | null>(null);
  readonly defaultSelected = input(false);
  readonly saving = input(false);
  readonly submitted = output<AddressFormSubmission>();
  readonly cancelled = output<void>();

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
    effect(() => this.reset(this.address(), this.defaultSelected()));
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const current = this.address();
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

    if (current) {
      this.submitted.emit({
        kind: 'update',
        addressId: current.id,
        request: {
          ...baseAddress,
          phoneNumber: current.phoneNumber,
          version: current.version,
        },
      });
      return;
    }

    this.submitted.emit({
      kind: 'create',
      request: {
        ...baseAddress,
        phoneNumber: null,
        isDefault: values.isDefault,
      },
    });
  }

  cancel(): void {
    if (!this.saving()) this.cancelled.emit();
  }

  private reset(address: CustomerAddress | null, defaultSelected: boolean): void {
    this.form.reset({
      label: address?.label ?? '',
      recipientName: address?.recipientName ?? '',
      addressLine1: address?.addressLine1 ?? '',
      addressLine2: address?.addressLine2 ?? '',
      city: address?.city ?? '',
      region: address?.region ?? '',
      postalCode: address?.postalCode ?? '',
      countryCode: address?.countryCode ?? '',
      isDefault: address?.isDefault ?? defaultSelected,
    });
  }

  private optional(value: string): string | null {
    const normalized = value.trim();
    return normalized || null;
  }
}
