import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

export interface LoginRequest { email: string; password: string; rememberMe: boolean; }
export interface RegisterRequest { email: string; password: string; confirmPassword: string; }
export interface CurrentUser { id: string; email: string; roles: string[]; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth';

  private readonly currentUserState = signal<CurrentUser | null>(null);
  private readonly initializedState = signal(false);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly initializedChanges = toObservable(this.initializedState);
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  initialize(): void {
    this.initializeCsrf()
      .pipe(
        switchMap(() => this.loadCurrentUser()),
        finalize(() => this.initializedState.set(true)),
      )
      .subscribe({ error: () => this.currentUserState.set(null) });
  }

  initializeCsrf() { return this.http.get<void>(`${this.apiUrl}/csrf`); }

  login(request: LoginRequest): Observable<void> {
    return this.initializeCsrf().pipe(
      switchMap(() => this.http.post<void>(`${this.apiUrl}/login`, request)),
      switchMap(() => this.refreshAuthenticatedSession()),
    );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.initializeCsrf().pipe(
      switchMap(() => this.http.post<void>(`${this.apiUrl}/register`, request)),
      switchMap(() => this.refreshAuthenticatedSession()),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => this.currentUserState.set(null)),
      switchMap(() => this.initializeCsrf()),
    );
  }

  hasRole(role: string): boolean {
    return this.currentUserState()?.roles.includes(role) ?? false;
  }

  private refreshAuthenticatedSession(): Observable<void> {
    return this.initializeCsrf().pipe(
      switchMap(() => this.loadCurrentUser()),
      map(() => undefined),
    );
  }

  private loadCurrentUser(): Observable<CurrentUser | null> {
    return this.http.get<CurrentUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => this.currentUserState.set(user)),
      catchError((error) => {
        if (error.status === 401) {
          this.currentUserState.set(null);
          return of(null);
        }

        return throwError(() => error);
      }),
    );
  }
}
