// In-memory storage for internal carts
// Similar pattern to depositSessionStorage, but for full cart state

import { InternalCart, InternalCartItem } from '@/types/internal-cart.types';

interface StoredCart {
  data: InternalCart;
  expiresAt: number;
}

class InternalCartStorage {
  private carts: Map<string, StoredCart> = new Map();
  // 7 days TTL for cart by default
  private readonly TTL_MS = 7 * 24 * 60 * 60 * 1000;

  createCart(cartId: string, data: Omit<InternalCart, 'id' | 'createdAt' | 'updatedAt'>, ttlMs?: number): InternalCart {
    const now = Date.now();
    const cart: InternalCart = {
      id: cartId,
      items: data.items,
      createdAt: now,
      updatedAt: now,
    };

    const expiresAt = now + (ttlMs || this.TTL_MS);
    this.carts.set(cartId, { data: cart, expiresAt });
    this.cleanup();
    return cart;
  }

  getCart(cartId: string): InternalCart | null {
    const stored = this.carts.get(cartId);
    if (!stored) return null;

    if (Date.now() > stored.expiresAt) {
      this.carts.delete(cartId);
      return null;
    }

    return stored.data;
  }

  saveCart(cart: InternalCart, ttlMs?: number): InternalCart {
    const now = Date.now();
    const expiresAt = now + (ttlMs || this.TTL_MS);
    const updated: InternalCart = {
      ...cart,
      updatedAt: now,
    };
    this.carts.set(cart.id, { data: updated, expiresAt });
    return updated;
  }

  deleteCart(cartId: string): boolean {
    return this.carts.delete(cartId);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, stored] of this.carts.entries()) {
      if (now > stored.expiresAt) {
        this.carts.delete(id);
      }
    }
  }

  // Utility to generate a new cart ID
  generateCartId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  // Small helper to add an item to cart in storage (used by API)
  addItem(cart: InternalCart, item: InternalCartItem): InternalCart {
    const updated: InternalCart = {
      ...cart,
      items: [...cart.items, item],
    };
    return this.saveCart(updated);
  }
}

export const internalCartStorage = new InternalCartStorage();


