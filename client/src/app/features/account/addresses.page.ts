import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-addresses-page',
  templateUrl: './addresses.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressesPage {}
