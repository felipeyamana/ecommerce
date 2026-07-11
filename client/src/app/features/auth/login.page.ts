import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({ selector: 'app-login-page', imports: [ReactiveFormsModule], templateUrl: './login.page.html', styleUrl: './login.page.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class LoginPage {
  private readonly fb = inject(FormBuilder); private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly mode = signal<'login' | 'register'>('login'); readonly busy = signal(false); readonly error = signal('');
  readonly loginForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required], rememberMe: [false] });
  readonly registerForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]], confirmPassword: ['', Validators.required] });
  constructor() { this.auth.initializeCsrf().subscribe(); }
  submitLogin(): void { if (this.loginForm.invalid) return this.loginForm.markAllAsTouched(); this.run(this.auth.login(this.loginForm.getRawValue())); }
  submitRegistration(): void { if (this.registerForm.invalid) return this.registerForm.markAllAsTouched(); const value = this.registerForm.getRawValue(); if (value.password !== value.confirmPassword) { this.error.set('Passwords do not match.'); return; } this.run(this.auth.register(value)); }
  private run(request: Observable<void>): void { this.busy.set(true); this.error.set(''); request.pipe(finalize(() => this.busy.set(false))).subscribe({ next: () => void this.router.navigateByUrl('/'), error: (response) => this.error.set(response.error?.message ?? 'Something went wrong. Please try again.') }); }
}
