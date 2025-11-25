// Partial Payment System Types

export type PaymentStatus = 'pending_deposit' | 'partial_paid' | 'fully_paid';

export interface PartialPaymentMetafields {
  deposit_amount: number;
  remaining_amount: number;
  deposit_paid: boolean;
  remaining_paid: boolean;
  payment_status: PaymentStatus;
  payment_link?: string;
  plan?: string;
  session_id: string;
}

export interface DepositSession {
  session_id: string;
  customer_id?: string;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  total_amount: number;
  deposit_amount: number;
  remaining_amount: number;
  draft_order_id: string;
  checkout_url?: string;
  created_at: string;
  expires_at: string;
}

export interface DepositSessionCreateRequest {
  customer_id?: string;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  total_amount: number;
  deposit_amount: number;
}

export interface DepositSessionResponse {
  deposit_session_url: string;
  session_id: string;
}

