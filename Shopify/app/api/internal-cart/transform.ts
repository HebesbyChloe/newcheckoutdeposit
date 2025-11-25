import { InternalCart } from '@/types/internal-cart.types';
import { Cart } from '@/types/api.types';

// Shared transformer: InternalCart (app-owned) -> Cart (UI shape)
export function transformInternalCartToCart(cart: InternalCart): Cart {
  const items = cart.items || [];

  if (items.length === 0) {
    return {
      id: cart.id,
      checkoutUrl: '',
      totalQuantity: 0,
      cost: {
        totalAmount: { amount: '0.00', currencyCode: 'USD' },
        subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
        totalTaxAmount: null,
        totalDutyAmount: null,
      },
      discountCodes: [],
      lines: [],
    };
  }

  const currencyCode = items[0].price.currencyCode || 'USD';
  let totalQuantity = 0;
  let subtotal = 0;

  const lines = items.map((item) => {
    const quantity = item.quantity > 0 ? item.quantity : 1;
    totalQuantity += quantity;
    const unitPrice = parseFloat(item.price.amount || '0');
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;

    return {
      id: item.id,
      quantity,
      attributes: item.attributes,
      merchandise: {
        id: item.variantId || item.externalId || item.id,
        title: item.title,
        price: {
          amount: item.price.amount,
          currencyCode,
        },
        metafields: [],
        product: {
          id: item.productHandle || item.variantId || item.externalId || item.id,
          title: item.title,
          handle: item.productHandle || '',
          images: [
            {
              url: item.imageUrl,
              altText: item.title,
            },
          ],
        },
      },
      cost: {
        totalAmount: {
          amount: lineTotal.toFixed(2),
          currencyCode,
        },
      },
    };
  });

  return {
    id: cart.id,
    checkoutUrl: '',
    totalQuantity,
    cost: {
      totalAmount: {
        amount: subtotal.toFixed(2),
        currencyCode,
      },
      subtotalAmount: {
        amount: subtotal.toFixed(2),
        currencyCode,
      },
      totalTaxAmount: null,
      totalDutyAmount: null,
    },
    discountCodes: [],
    lines,
  };
}


