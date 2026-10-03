import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { FavoritesService } from './favorites.service';

@Component({
  selector: 'app-favorite-button',
  template: `
    <button class="grid size-11 shrink-0 place-items-center rounded-xl border bg-white transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50"
      type="button" [class.text-rose-600]="favorites.isFavorite(productId())" [class.border-rose-300]="favorites.isFavorite(productId())"
      [class.text-slate-500]="!favorites.isFavorite(productId())" [class.border-slate-300]="!favorites.isFavorite(productId())"
      [attr.aria-label]="(favorites.isFavorite(productId()) ? 'Remove ' : 'Add ') + productName() + (favorites.isFavorite(productId()) ? ' from favourites' : ' to favourites')"
      [attr.aria-pressed]="favorites.isFavorite(productId())" [disabled]="favorites.pending().has(productId())" (click)="toggle()">
      <svg class="size-5" viewBox="0 0 24 24" [attr.fill]="favorites.isFavorite(productId()) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
    </button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoriteButton {
  readonly productId = input.required<number>();
  readonly productName = input.required<string>();
  readonly favorites = inject(FavoritesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  toggle(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.favorites.toggle(this.productId()).subscribe({ error: () => undefined });
  }
}
