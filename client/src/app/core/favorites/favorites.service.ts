import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, defer, finalize, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { Product } from '../products/products.service';

export interface Favorite { createdAtUtc: string; product: Product; }

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/favorites';
  private generation = 0;
  private loaded = false;
  private request?: Observable<Favorite[]>;
  readonly items = signal<readonly Favorite[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pending = signal<ReadonlySet<number>>(new Set());

  isFavorite(productId: number): boolean { return this.items().some(item => item.product.id === productId); }

  load(refresh = false): Observable<readonly Favorite[]> {
    if (this.request) return this.request;
    if (this.loaded && !refresh) return of(this.items());
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    const request = this.http.get<Favorite[]>(this.apiUrl).pipe(
      tap(items => { if (generation === this.generation) { this.items.set(items); this.loaded = true; } }),
      catchError(error => { if (generation === this.generation) this.setError(error); return throwError(() => error); }),
      finalize(() => { if (this.request === request) { this.request = undefined; this.loading.set(false); } }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.request = request;
    return request;
  }

  toggle(productId: number): Observable<unknown> {
    const generation = this.generation;
    return this.mutate(productId, () => this.load().pipe(switchMap(() =>
      generation !== this.generation ? of(undefined) : this.isFavorite(productId) ? this.removeRequest(productId) : this.addRequest(productId),
    )));
  }

  remove(productId: number): Observable<unknown> {
    return this.mutate(productId, () => this.removeRequest(productId));
  }

  reset(): void {
    this.generation++;
    this.loaded = false;
    this.request = undefined;
    this.items.set([]);
    this.pending.set(new Set());
    this.loading.set(false);
    this.error.set('');
  }

  private addRequest(productId: number): Observable<Favorite> {
    const generation = this.generation;
    return this.http.put<Favorite>(`${this.apiUrl}/${productId}`, {}).pipe(tap(item => {
      if (generation === this.generation) this.items.update(items => [item, ...items.filter(existing => existing.product.id !== productId)]);
    }));
  }

  private removeRequest(productId: number): Observable<void> {
    const generation = this.generation;
    return this.http.delete<void>(`${this.apiUrl}/${productId}`).pipe(tap(() => {
      if (generation === this.generation) this.items.update(items => items.filter(item => item.product.id !== productId));
    }));
  }

  private mutate(productId: number, operation: () => Observable<unknown>): Observable<unknown> {
    return defer(() => {
      if (this.pending().has(productId)) return of(undefined);
      const generation = this.generation;
      this.pending.update(pending => new Set(pending).add(productId));
      this.error.set('');
      return operation().pipe(
        catchError(error => { if (generation === this.generation) this.setError(error); return throwError(() => error); }),
        finalize(() => { if (generation === this.generation) this.pending.update(pending => { const next = new Set(pending); next.delete(productId); return next; }); }),
      );
    });
  }

  private setError(error: HttpErrorResponse): void {
    this.error.set(error.error?.message ?? 'We could not update your favourites. Please try again.');
  }
}
