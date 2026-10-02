import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountProfile, AccountService, UpdateAccountProfile } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
import { AccountPage } from './account.page';

describe('AccountPage', () => {
  const profile: AccountProfile = {
    email: 'alex@example.com',
    firstName: 'Alex',
    lastName: 'Shopper',
    phoneNumber: null,
    phoneRegionCode: null,
    createdAtUtc: '2025-01-10T12:00:00Z',
    updatedAtUtc: '2026-01-10T12:00:00Z',
    version: 'AAAAAAAAAAA=',
  };
  const profileState = signal<AccountProfile | null>(null);
  let load: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    profileState.set(null);
    load = vi.fn(() => {
      profileState.set(profile);
      return of(profile);
    });
    update = vi.fn((request: UpdateAccountProfile) => {
      const updated = { ...profile, ...request, updatedAtUtc: '2026-02-10T12:00:00Z' };
      profileState.set(updated);
      return of(updated);
    });

    await TestBed.configureTestingModule({
      imports: [AccountPage],
      providers: [
        {
          provide: AccountService,
          useValue: {
            profile: profileState.asReadonly(),
            load,
            update,
          },
        },
        {
          provide: AuthService,
          useValue: { displayName: () => 'Alex Shopper' },
        },
      ],
    }).compileComponents();
  });

  it('loads and displays the customer profile', () => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();

    expect(load).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      firstName: 'Alex',
      lastName: 'Shopper',
      phoneNumber: '',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('alex@example.com');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Alex Shopper');
  });

  it('saves normalized profile changes with the current version', () => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      firstName: '  Alexandra  ',
      lastName: 'Shopper',
      phoneNumber: '   ',
    });

    fixture.componentInstance.save();

    expect(update).toHaveBeenCalledWith({
      firstName: 'Alexandra',
      lastName: 'Shopper',
      phoneNumber: null,
      phoneRegionCode: null,
      version: profile.version,
    });
    expect(fixture.componentInstance.success()).toBe('Your profile has been updated.');
  });

  it('sends the normalized phone number with the selected region code', () => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      firstName: 'Alex',
      lastName: 'Shopper',
      phoneNumber: '+5511999999999',
    });
    fixture.componentInstance.setPhoneRegionCode('br');

    fixture.componentInstance.save();

    expect(update).toHaveBeenCalledWith({
      firstName: 'Alex',
      lastName: 'Shopper',
      phoneNumber: '+5511999999999',
      phoneRegionCode: 'BR',
      version: profile.version,
    });
  });
});
