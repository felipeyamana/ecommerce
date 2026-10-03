import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Favorite, FavoritesService } from './favorites.service';
import { Product } from '../products/products.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let http: HttpTestingController;
  const favorite: Favorite = { createdAtUtc: '2026-10-02T00:00:00Z', product: { id: 42, name: 'Headphones' } as Product };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FavoritesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads saved state, adds a favourite, and removes it with a second toggle', () => {
    service.toggle(42).subscribe();
    http.expectOne('/api/favorites').flush([]);
    expect(service.pending().has(42)).toBe(true);
    const add = http.expectOne('/api/favorites/42');
    expect(add.request.method).toBe('PUT');
    add.flush(favorite);
    expect(service.isFavorite(42)).toBe(true);
    expect(service.pending().has(42)).toBe(false);
    service.toggle(42).subscribe();
    const remove = http.expectOne('/api/favorites/42');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
    expect(service.items()).toEqual([]);
  });

  it('preserves favourites on a failed removal and allows retry', () => {
    service.load().subscribe();
    http.expectOne('/api/favorites').flush([favorite]);
    service.remove(42).subscribe({ error: () => undefined });
    http.expectOne('/api/favorites/42').flush({ message: 'Please try again.' }, { status: 503, statusText: 'Unavailable' });
    expect(service.isFavorite(42)).toBe(true);
    expect(service.error()).toBe('Please try again.');
    expect(service.pending().size).toBe(0);
    service.remove(42).subscribe();
    http.expectOne('/api/favorites/42').flush(null);
    expect(service.items()).toEqual([]);
  });

  it('prevents repeated clicks from sending duplicate mutations', () => {
    service.load().subscribe();
    http.expectOne('/api/favorites').flush([]);
    service.toggle(42).subscribe();
    service.toggle(42).subscribe();
    http.expectOne('/api/favorites/42').flush(favorite);
    expect(service.items()).toHaveLength(1);
  });

  it('does not restore another user’s saved state when an old response arrives after reset', () => {
    service.load().subscribe();
    const request = http.expectOne('/api/favorites');
    service.reset();
    request.flush([favorite]);
    expect(service.items()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
