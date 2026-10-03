import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FavoritesPage } from './favorites.page';

describe('Favourites page', () => {
  it('displays saved products and removes them through the API', async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritesPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(FavoritesPage);
    http.expectOne('/api/favorites').flush([{
      createdAtUtc: '2026-10-02T00:00:00Z',
      product: { id: 42, name: 'Headphones', subCategoryId: 7, categoryName: 'Electronics', currentPrice: 50, priceCurrencyCode: 'USD', isActive: true },
    }]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')?.getAttribute('src')).toBe('/category-placeholders/audio.png');
    element.querySelector<HTMLButtonElement>('[aria-label="Remove Headphones from favourites"]')!.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('Removing…');
    const request = http.expectOne('/api/favorites/42');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    fixture.detectChanges();
    expect(element.textContent).toContain('No favourites yet');
    http.verify();
  });
});
