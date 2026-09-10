import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly loggingOut = signal(false);
  readonly announcement = signal('');

  closeCategories(event: FocusEvent, menu: HTMLDetailsElement): void {
    if (!(event.relatedTarget instanceof Node) || !menu.contains(event.relatedTarget)) {
      menu.open = false;
    }
  }

  showComingSoon(feature: string): void {
    this.announcement.set(`${feature} is coming soon. You can browse all products in the meantime.`);
  }

  search(event: Event, query: string): void {
    event.preventDefault();
    if (query.trim()) this.showComingSoon('Product search');
  }

  constructor() {
    this.auth.initialize();
  }

  logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().pipe(finalize(() => this.loggingOut.set(false))).subscribe({
      next: () => this.cart.reset(),
    });
  }
}
