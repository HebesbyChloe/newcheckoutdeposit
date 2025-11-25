// Shop API service
import { shopifyClient } from '@/lib/shopify';
import { shopQuery, menuQuery } from './queries/shop.queries';
import { Shop, Menu } from '@/types/shopify';

export class ShopService {
  /**
   * Get shop information
   */
  async getShop(): Promise<Shop> {
    try {
      const data = await shopifyClient.request<{ shop: Shop }>(shopQuery);
      return data.shop;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get menu by handle
   */
  async getMenu(handle: string): Promise<Menu | null> {
    try {
      const data = await shopifyClient.request<{ menu: Menu | null }>(
        menuQuery,
        { handle }
      );
      return data.menu;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const shopService = new ShopService();
