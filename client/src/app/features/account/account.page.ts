import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import IntlTelInput from '@intl-tel-input/angular';
import type { Iso2 } from 'intl-tel-input';
import { finalize } from 'rxjs';
import { AccountProfile, AccountService } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-account-page',
  imports: [DatePipe, ReactiveFormsModule, IntlTelInput],
  templateUrl: './account.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly account = inject(AccountService);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly phoneRegionCode = signal('');
  readonly phoneInitialCountry = signal<Iso2>('br');
  readonly loadPhoneUtils = () => import('intl-tel-input/utils');
  readonly phoneInputAttributes: Record<string, string> = {
    id: 'account-phone',
    name: 'phone',
    autocomplete: 'tel',
    'aria-describedby': 'account-phone-hint',
    class:
      'w-full rounded-xl border border-slate-300 px-3.5 py-3 outline-none transition focus:border-blue-700 focus:ring-3 focus:ring-blue-700/15',
  };
  readonly fullName = computed(() => {
    const profile = this.account.profile();
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
    return name || this.auth.displayName();
  });

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    phoneNumber: ['', Validators.maxLength(32)],
  });

  constructor() {
    this.load();
  }

  load(refresh = false): void {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.account
      .load(refresh)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (profile) => this.populateForm(profile),
        error: (error: HttpErrorResponse) => this.handleError(error, 'We could not load your account.'),
      });
  }

  save(): void {
    const profile = this.account.profile();
    if (!profile || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.success.set('');

    this.account
      .update({
        firstName: this.optional(values.firstName),
        lastName: this.optional(values.lastName),
        phoneNumber: this.optional(values.phoneNumber),
        phoneRegionCode: this.optional(values.phoneNumber) ? this.phoneRegionCode().toUpperCase() : null,
        version: profile.version,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updatedProfile) => {
          this.populateForm(updatedProfile);
          this.success.set('Your profile has been updated.');
        },
        error: (error: HttpErrorResponse) =>
          this.handleError(
            error,
            error.status === 409
              ? 'Your profile changed in another session. Reload it before saving again.'
              : 'We could not update your profile.',
          ),
      });
  }

  private populateForm(profile: AccountProfile): void {
    const phoneRegionCode = profile.phoneRegionCode?.toUpperCase() ?? '';
    this.phoneRegionCode.set(phoneRegionCode);
    this.phoneInitialCountry.set((phoneRegionCode.toLowerCase() || 'br') as Iso2);
    this.form.setValue({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phoneNumber: profile.phoneNumber ?? '',
    });
    this.form.markAsPristine();
  }

  setPhoneRegionCode(regionCode: string): void {
    this.phoneRegionCode.set(regionCode.toUpperCase());
  }

  private optional(value: string): string | null {
    const normalized = value.trim();
    return normalized || null;
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    this.error.set(error.error?.message ?? fallback);
  }
}
