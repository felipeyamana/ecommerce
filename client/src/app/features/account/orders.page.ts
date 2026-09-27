import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink],
  templateUrl: './orders.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage {}
