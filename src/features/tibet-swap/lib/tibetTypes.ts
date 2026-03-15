/**
 * TibetSwap v2 API types (from OpenAPI 2.0.0)
 * https://api.v2.tibetswap.io/docs
 */

export interface TibetToken {
  asset_id: string;
  hidden_puzzle_hash: string | null;
  name: string;
  short_name: string;
  image_url: string | null;
  verified: boolean;
}

export interface TibetApiPair {
  pair_id: string;
  asset_id: string;
  asset_hidden_puzzle_hash: string | null;
  asset_name: string;
  asset_short_name: string;
  asset_image_url: string | null;
  asset_verified: boolean;
  inverse_fee: number;
  liquidity_asset_id: string;
  xch_reserve: number;
  token_reserve: number;
  liquidity: number;
  last_coin_id_on_chain: string;
}

export interface TibetRouter {
  launcher_id: string;
  current_id: string;
  rcat: boolean;
}

export interface TibetQuote {
  amount_in: number;
  amount_out: number;
  price_warning: boolean;
  price_impact: number;
  fee: number | null;
  asset_id: string;
  input_reserve: number;
  output_reserve: number;
}

export type TibetActionType = "SWAP" | "ADD_LIQUIDITY" | "REMOVE_LIQUIDITY";

export interface TibetCreateOfferBody {
  offer: string;
  action: TibetActionType;
  total_donation_amount?: number;
  donation_addresses?: string[];
  donation_weights?: number[];
}

export interface TibetOfferResponse {
  success: boolean;
  message: string;
  offer_id: string;
}

export interface TibetQuoteParams {
  pair_id: string;
  amount_in?: number | null;
  amount_out?: number | null;
  xch_is_input?: boolean;
  estimate_fee?: boolean;
}

export interface TibetCreateOfferParams {
  pair_id: string;
  body: TibetCreateOfferBody;
}
