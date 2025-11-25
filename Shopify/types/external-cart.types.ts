// External Cart System Types

export type SourceType = 'labgrown' | 'natural' | 'moissanite' | 'coloredstone' | 'custom';

export interface ExternalCartAddRequest {
  external_id: string;
  source_type: SourceType;
  title: string;
  image?: string;
  price: number;
  payload?: Record<string, any>;
}

export interface ExternalCartAddResponse {
  checkoutUrl: string;
  variantId: string;
  productId: string;
  error?: string;
}

export interface DummyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  sourceType: SourceType;
}

export interface ExternalVariant {
  id: string;
  sku: string;
  price: string;
  externalId: string;
  payload?: Record<string, any>;
}

// UI-facing diamond detail types used by the external diamonds page
export interface DiamondDetailSpecs {
  depth?: string;
  table?: string;
  polish?: string;
  symmetry?: string;
  fluorescence?: string;
  measurements?: string;
  culet?: string;
  crownAngle?: string;
  crownHeight?: string;
  pavilionAngle?: string;
  pavilionDepth?: string;
  eyeClean?: string;
}

export interface DiamondDetailData {
  id: string;
  sku: string;
  title: string;
  shape?: string;
  carat?: number;
  color?: string;
  intensity?: string;
  clarity?: string;
  cut?: string;
  price: number;
  images: string[];
  video?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  lab?: string;
  shippingDate?: string;
  countryCode?: string;
  countryName?: string;
  specs: DiamondDetailSpecs;
}


