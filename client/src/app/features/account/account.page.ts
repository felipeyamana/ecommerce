import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-account-page',
  templateUrl: './account.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  readonly auth = inject(AuthService);
}
