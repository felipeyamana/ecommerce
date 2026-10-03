import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, finalize, forkJoin, switchMap, take, timeout, timer } from 'rxjs';
import { AddressesService } from '../../core/account/addresses.service';
import { CartService } from '../../core/cart/cart.service';
import { Order, OrdersService } from '../../core/orders/orders.service';
import { StripeCheckoutService } from '../../core/payments/stripe-checkout.service';
import {
  AddressFormComponent,
  AddressFormSubmission,
} from '../../shared/address-form/address-form.component';

type PaymentState = 'idle' | 'loading' | 'ready' | 'processing' | 'paid';

@Component({
  selector: 'app-checkout-page',
  imports: [AddressFormComponent, CurrencyPipe, RouterLink],
  templateUrl: './checkout.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [StripeCheckoutService],
})
export class CheckoutPage implements OnDestroy {
  readonly cartService = inject(CartService);
  readonly addressesService = inject(AddressesService);
  private readonly ordersService = inject(OrdersService);
  private readonly stripeCheckout = inject(StripeCheckoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly checkoutContainer = viewChild<ElementRef<HTMLElement>>('checkoutContainer');
  private readonly pendingClientSecret = signal<string | null>(null);
  private mounting = false;
  private readonly mountPaymentEffect = effect(() => {
    const container = this.checkoutContainer()?.nativeElement;
    const clientSecret = this.pendingClientSecret();
    if (container && clientSecret && !this.mounting) {
      void this.mountPaymentForm(clientSecret, container);
    }
  });

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly savingAddress = signal(false);
  readonly addressFormOpen = signal(false);
  readonly selectedAddressId = signal<string | null>(null);
  readonly createdOrder = signal<Order | null>(null);
  readonly paymentState = signal<PaymentState>('idle');
  readonly paymentError = signal('');
  readonly addressError = signal('');
  readonly error = signal('');

  readonly cartNeedsReview = computed(() =>
    this.cartService.cart()?.items.some((item) => item.priceChanged || !item.isAvailable) ?? false,
  );

  readonly canCreateOrder = computed(() => {
    const cart = this.cartService.cart();
    return !this.loading() &&
      !this.submitting() &&
      !this.savingAddress() &&
      !this.createdOrder() &&
      !!this.selectedAddressId() &&
      !!cart?.items.length &&
      !this.cartNeedsReview();
  });

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.pendingClientSecret.set(null);
    this.stripeCheckout.destroy();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      cart: this.cartService.load(true),
      addresses: this.addressesService.load(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ addresses }) => {
          const selectedStillExists = addresses.some((address) => address.id === this.selectedAddressId());
          if (!selectedStillExists) {
            this.selectedAddressId.set(
              addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null,
            );
          }
          if (addresses.length === 0) this.addressFormOpen.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(error.error?.message ?? 'We could not prepare checkout. Please try again.');
        },
      });
  }

  selectAddress(addressId: string): void {
    if (!this.submitting() && !this.savingAddress() && !this.createdOrder()) {
      this.selectedAddressId.set(addressId);
    }
  }

  startAddAddress(): void {
    if (this.submitting() || this.savingAddress() || this.createdOrder()) return;
    this.addressError.set('');
    this.addressFormOpen.set(true);
  }

  cancelAddAddress(): void {
    if (!this.savingAddress()) this.addressFormOpen.set(false);
  }

  saveAddress(submission: AddressFormSubmission): void {
    if (submission.kind !== 'create' || this.savingAddress() || this.createdOrder()) return;

    this.savingAddress.set(true);
    this.addressError.set('');
    this.addressesService
      .create(submission.request)
      .pipe(finalize(() => this.savingAddress.set(false)))
      .subscribe({
        next: (address) => {
          this.selectedAddressId.set(address.id);
          this.addressFormOpen.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.addressError.set(error.error?.message ?? 'We could not save your delivery address.');
        },
      });
  }

  createOrder(): void {
    const addressId = this.selectedAddressId();
    const cart = this.cartService.cart();
    if (!this.canCreateOrder() || !addressId || !cart) return;

    this.submitting.set(true);
    this.error.set('');
    this.ordersService
      .create({ addressId, cartVersion: cart.version })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (order) => {
          this.createdOrder.set(order);
          this.cartService.reset();
          this.startPayment(order.id);
        },
        error: (error: HttpErrorResponse) => this.handleCreateError(error),
      });
  }

  retryPayment(): void {
    const order = this.createdOrder();
    if (order && this.paymentState() !== 'processing' && this.paymentState() !== 'paid') {
      this.startPayment(order.id);
    }
  }

  private startPayment(orderId: string): void {
    this.stripeCheckout.destroy();
    this.pendingClientSecret.set(null);
    this.paymentState.set('loading');
    this.paymentError.set('');

    this.ordersService
      .createCheckoutSession(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.pendingClientSecret.set(session.clientSecret);
        },
        error: (error: HttpErrorResponse) => {
          this.paymentState.set('idle');
          this.paymentError.set(error.error?.message ?? 'We could not load the secure payment form.');
        },
      });
  }

  private async mountPaymentForm(clientSecret: string, container: HTMLElement): Promise<void> {
    this.mounting = true;
    try {
      await this.stripeCheckout.mount(
        clientSecret,
        container,
        () => this.handlePaymentComplete(),
      );
      if (this.pendingClientSecret() === clientSecret) {
        this.pendingClientSecret.set(null);
      }
      this.paymentState.set('ready');
    } catch {
      this.paymentState.set('idle');
      this.paymentError.set('The secure payment form could not be loaded. Please try again.');
    } finally {
      this.mounting = false;
    }
  }

  private handlePaymentComplete(): void {
    const order = this.createdOrder();
    if (!order || this.paymentState() === 'processing' || this.paymentState() === 'paid') return;

    this.stripeCheckout.destroy();
    this.paymentState.set('processing');
    this.paymentError.set('');

    timer(0, 1000)
      .pipe(
        switchMap(() => this.ordersService.get(order.id)),
        filter((currentOrder) => currentOrder.paymentStatus.toLowerCase() === 'paid'),
        take(1),
        timeout({ first: 20000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (paidOrder) => {
          this.createdOrder.set(paidOrder);
          this.paymentState.set('paid');
        },
        error: () => {
          this.paymentError.set(
            'Payment was submitted, but confirmation is taking longer than expected. Check your orders shortly.',
          );
        },
      });
  }

  private handleCreateError(error: HttpErrorResponse): void {
    if (error.status === 409) {
      this.error.set('Your cart changed before the order was created. Return to the cart and review it again.');
      return;
    }

    this.error.set(error.error?.message ?? 'We could not create your order. Please try again.');
  }
}
