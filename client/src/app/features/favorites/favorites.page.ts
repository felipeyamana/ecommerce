import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../core/favorites/favorites.service';
import { productImage } from '../../core/products/product-image';

@Component({
  selector: 'app-favorites-page',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './favorites.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesPage {
  readonly favorites = inject(FavoritesService);
  readonly productImage = productImage;
  private readonly destroyRef = inject(DestroyRef);
  constructor() { this.load(); }
  load(refresh = false): void {
    this.favorites.load(refresh).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
  }
  remove(productId: number): void {
    this.favorites.remove(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
  }
}
