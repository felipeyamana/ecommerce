import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';

export interface AccountProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  phoneRegionCode: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  version: string;
}

export interface UpdateAccountProfile {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  phoneRegionCode: string | null;
  version: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/account';
  private readonly profileState = signal<AccountProfile | null>(null);
  private loadRequest: Observable<AccountProfile> | null = null;

  readonly profile = this.profileState.asReadonly();

  load(refresh = false): Observable<AccountProfile> {
    const profile = this.profileState();
    if (!refresh && profile) return of(profile);
    if (this.loadRequest) return this.loadRequest;

    const request = this.http.get<AccountProfile>(this.apiUrl).pipe(
      tap((loadedProfile) => this.profileState.set(loadedProfile)),
      finalize(() => {
        if (this.loadRequest === request) this.loadRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.loadRequest = request;
    return request;
  }

  update(profile: UpdateAccountProfile): Observable<AccountProfile> {
    return this.http
      .put<AccountProfile>(this.apiUrl, profile)
      .pipe(tap((updatedProfile) => this.profileState.set(updatedProfile)));
  }
}
