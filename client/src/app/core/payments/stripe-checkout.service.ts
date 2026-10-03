import { Injectable, NgZone, inject } from '@angular/core';
import { Stripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';

const stripePublishableKey =
  'pk_test_51ULjww51HJYp3jKv8127umFXvUx1OeRViHazFoQPrGBD5L2KDma9HzpebYMXfA8mPFJsCYXfZsi7lYLkTYaV3Qb2002JLwe3BM';

@Injectable()
export class StripeCheckoutService {
  private readonly zone = inject(NgZone);
  private stripePromise: Promise<Stripe | null> | null = null;
  private checkout: StripeEmbeddedCheckout | null = null;
  private requestId = 0;

  async mount(
    clientSecret: string,
    container: HTMLElement,
    onComplete: () => void,
  ): Promise<void> {
    this.destroyCurrent();
    const requestId = ++this.requestId;
    this.stripePromise ??= loadStripe(stripePublishableKey);

    const stripe = await this.stripePromise;
    if (!stripe) {
      throw new Error('Stripe.js could not be loaded.');
    }

    const checkout = await stripe.createEmbeddedCheckoutPage({
      clientSecret,
      onComplete: () => this.zone.run(onComplete),
    });

    if (requestId !== this.requestId) {
      checkout.destroy();
      return;
    }

    this.checkout = checkout;
    checkout.mount(container);
  }

  destroy(): void {
    this.requestId++;
    this.destroyCurrent();
  }

  private destroyCurrent(): void {
    const checkout = this.checkout;
    this.checkout = null;
    checkout?.destroy();
  }
}
