import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPage } from './login.page';

describe('LoginPage registration', () => {
  let register: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    register = vi.fn(() => of(undefined));

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { mode: 'register' },
              queryParamMap: { get: () => null },
            },
          },
        },
        {
          provide: AuthService,
          useValue: { register, login: vi.fn(() => of(undefined)) },
        },
      ],
    }).compileComponents();
  });

  it('shows the password requirements and updates their status as the user types', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const password = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#register-password',
    )!;
    password.value = 'ecommerceuser';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const requirements = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-password-requirement]'),
    );

    expect(requirements).toHaveLength(4);
    expect(requirements[0].textContent).toContain('✓');
    expect(requirements[1].textContent).toContain('✓');
    expect(requirements[2].textContent).toContain('○');
    expect(requirements[3].textContent).toContain('○');

    password.value = 'Ecommerce1';
    password.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(requirements.every((requirement) => requirement.textContent?.includes('✓'))).toBe(true);
  });

  it('does not submit a password that the products API would reject', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.registerForm.setValue({
      email: 'shopper@example.com',
      password: 'ecommerceuser',
      confirmPassword: 'ecommerceuser',
    });

    fixture.componentInstance.submitRegistration();

    expect(fixture.componentInstance.registerForm.controls.password.invalid).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });
});
