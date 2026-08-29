export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type CardFk = {
  foreignKeyName: "user_collections_card_id_fkey";
  columns: ["card_id"];
  isOneToOne: false;
  referencedRelation: "cards";
  referencedColumns: ["id"];
};

type ProfileFk = {
  foreignKeyName: "user_collections_user_id_fkey";
  columns: ["user_id"];
  isOneToOne: false;
  referencedRelation: "profiles";
  referencedColumns: ["id"];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          accent: string;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          accent?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          accent?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          card_number: string | null;
          name: string;
          set_name: string | null;
          rarity: string | null;
          color: string | null;
          type: string | null;
          cost: string | null;
          power: string | null;
          counter: string | null;
          attribute: string | null;
          image_url: string | null;
          market_price_cents: number | null;
          market_price_updated_at: string | null;
          justtcg_card_id: string | null;
          justtcg_set_id: string | null;
          tcgplayer_product_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_number?: string | null;
          name: string;
          set_name?: string | null;
          rarity?: string | null;
          color?: string | null;
          type?: string | null;
          cost?: string | null;
          power?: string | null;
          counter?: string | null;
          attribute?: string | null;
          image_url?: string | null;
          market_price_cents?: number | null;
          market_price_updated_at?: string | null;
          justtcg_card_id?: string | null;
          justtcg_set_id?: string | null;
          tcgplayer_product_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_number?: string | null;
          name?: string;
          set_name?: string | null;
          rarity?: string | null;
          color?: string | null;
          type?: string | null;
          cost?: string | null;
          power?: string | null;
          counter?: string | null;
          attribute?: string | null;
          image_url?: string | null;
          market_price_cents?: number | null;
          market_price_updated_at?: string | null;
          justtcg_card_id?: string | null;
          justtcg_set_id?: string | null;
          tcgplayer_product_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      card_prices: {
        Row: {
          id: string;
          card_id: string;
          provider: string;
          external_card_id: string | null;
          external_variant_id: string | null;
          printing: string;
          condition: string;
          market_price_cents: number;
          currency: string;
          price_change_24h_pct: number | null;
          price_change_7d_pct: number | null;
          fetched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          provider?: string;
          external_card_id?: string | null;
          external_variant_id?: string | null;
          printing: string;
          condition: string;
          market_price_cents: number;
          currency?: string;
          price_change_24h_pct?: number | null;
          price_change_7d_pct?: number | null;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          provider?: string;
          external_card_id?: string | null;
          external_variant_id?: string | null;
          printing?: string;
          condition?: string;
          market_price_cents?: number;
          currency?: string;
          price_change_24h_pct?: number | null;
          price_change_7d_pct?: number | null;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "card_prices_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      card_price_snapshots: {
        Row: {
          id: string;
          card_price_id: string;
          market_price_cents: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          card_price_id: string;
          market_price_cents: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          card_price_id?: string;
          market_price_cents?: number;
          recorded_at?: string;
        };
        Relationships: [];
      };
      user_collections: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          quantity: number;
          condition: string | null;
          notes: string | null;
          is_for_trade: boolean;
          showcase_slot: number | null;
          is_graded: boolean;
          grading_company: string | null;
          grade: number | null;
          cert_number: string | null;
          slab_image_url: string | null;
          is_black_label: boolean;
          estimated_value_cents: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          quantity?: number;
          condition?: string | null;
          notes?: string | null;
          is_for_trade?: boolean;
          showcase_slot?: number | null;
          is_graded?: boolean;
          grading_company?: string | null;
          grade?: number | null;
          cert_number?: string | null;
          slab_image_url?: string | null;
          is_black_label?: boolean;
          estimated_value_cents?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          quantity?: number;
          condition?: string | null;
          notes?: string | null;
          is_for_trade?: boolean;
          showcase_slot?: number | null;
          is_graded?: boolean;
          grading_company?: string | null;
          grade?: number | null;
          cert_number?: string | null;
          slab_image_url?: string | null;
          is_black_label?: boolean;
          estimated_value_cents?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [CardFk, ProfileFk];
      };
      shop_settings: {
        Row: {
          id: string;
          owner_user_id: string;
          store_name: string;
          support_email: string | null;
          shipping_cents: number;
          currency: string;
          is_live: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          store_name?: string;
          support_email?: string | null;
          shipping_cents?: number;
          currency?: string;
          is_live?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          store_name?: string;
          support_email?: string | null;
          shipping_cents?: number;
          currency?: string;
          is_live?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_listings: {
        Row: {
          id: string;
          owner_user_id: string;
          kind: string;
          title: string;
          description: string | null;
          condition: string | null;
          quantity_available: number;
          price_cents: number;
          unit_cost_cents: number | null;
          card_id: string | null;
          collection_id: string | null;
          status: string;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          kind: string;
          title: string;
          description?: string | null;
          condition?: string | null;
          quantity_available?: number;
          price_cents: number;
          unit_cost_cents?: number | null;
          card_id?: string | null;
          collection_id?: string | null;
          status?: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          kind?: string;
          title?: string;
          description?: string | null;
          condition?: string | null;
          quantity_available?: number;
          price_cents?: number;
          unit_cost_cents?: number | null;
          card_id?: string | null;
          collection_id?: string | null;
          status?: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_listings_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_listings_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "user_collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_listings_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_listing_items: {
        Row: {
          id: string;
          listing_id: string;
          card_id: string;
          quantity: number;
          condition: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          card_id: string;
          quantity?: number;
          condition?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          card_id?: string;
          quantity?: number;
          condition?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_listing_items_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "shop_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_listing_items_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          id: string;
          order_id: string | null;
          listing_id: string;
          quantity: number;
          status: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          listing_id: string;
          quantity: number;
          status?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          listing_id?: string;
          quantity?: number;
          status?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      shop_orders: {
        Row: {
          id: string;
          order_number: string;
          owner_user_id: string;
          buyer_email: string;
          buyer_user_id: string | null;
          status: string;
          currency: string;
          subtotal_cents: number;
          shipping_cents: number;
          total_cents: number;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          shipping_name: string | null;
          shipping_address: Json | null;
          tracking_number: string | null;
          notes: string | null;
          paid_at: string | null;
          shipped_at: string | null;
          refunded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          owner_user_id: string;
          buyer_email: string;
          buyer_user_id?: string | null;
          status?: string;
          currency?: string;
          subtotal_cents: number;
          shipping_cents: number;
          total_cents: number;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          shipping_name?: string | null;
          shipping_address?: Json | null;
          tracking_number?: string | null;
          notes?: string | null;
          paid_at?: string | null;
          shipped_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          owner_user_id?: string;
          buyer_email?: string;
          buyer_user_id?: string | null;
          status?: string;
          currency?: string;
          subtotal_cents?: number;
          shipping_cents?: number;
          total_cents?: number;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          shipping_name?: string | null;
          shipping_address?: Json | null;
          tracking_number?: string | null;
          notes?: string | null;
          paid_at?: string | null;
          shipped_at?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_orders_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_order_items: {
        Row: {
          id: string;
          order_id: string;
          listing_id: string | null;
          title: string;
          kind: string;
          condition: string | null;
          quantity: number;
          unit_price_cents: number;
          unit_cost_cents: number | null;
          card_id: string | null;
          collection_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          listing_id?: string | null;
          title: string;
          kind: string;
          condition?: string | null;
          quantity: number;
          unit_price_cents: number;
          unit_cost_cents?: number | null;
          card_id?: string | null;
          collection_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          listing_id?: string | null;
          title?: string;
          kind?: string;
          condition?: string | null;
          quantity?: number;
          unit_price_cents?: number;
          unit_cost_cents?: number | null;
          card_id?: string | null;
          collection_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "shop_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_order_items_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "shop_listings";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_ledger: {
        Row: {
          id: string;
          order_id: string;
          order_item_id: string;
          sold_at: string;
          listing_id: string | null;
          card_id: string | null;
          title: string;
          quantity: number;
          revenue_cents: number;
          cogs_cents: number;
          shipping_destination_state: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          order_item_id: string;
          sold_at?: string;
          listing_id?: string | null;
          card_id?: string | null;
          title: string;
          quantity: number;
          revenue_cents: number;
          cogs_cents?: number;
          shipping_destination_state?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          order_item_id?: string;
          sold_at?: string;
          listing_id?: string | null;
          card_id?: string | null;
          title?: string;
          quantity?: number;
          revenue_cents?: number;
          cogs_cents?: number;
          shipping_destination_state?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_ledger_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "shop_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_ledger_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "shop_order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      collection_views: {
        Row: {
          id: string;
          profile_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_views_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_value_snapshots: {
        Row: {
          id: string;
          user_id: string;
          total_value_cents: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_value_cents: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_value_cents?: number;
          recorded_at?: string;
        };
        Relationships: [];
      };
      trade_offers: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          target_collection_id: string;
          message: string | null;
          status: "pending" | "accepted" | "declined" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          target_collection_id: string;
          message?: string | null;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          target_collection_id?: string;
          message?: string | null;
          status?: "pending" | "accepted" | "declined" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_offers_target_collection_id_fkey";
            columns: ["target_collection_id"];
            isOneToOne: false;
            referencedRelation: "user_collections";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_events: {
        Row: {
          id: string;
          profile_id: string;
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      trade_alerts: {
        Row: {
          id: string;
          user_id: string;
          card_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_alerts_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_public_collection: {
        Args: { target_username: string };
        Returns: PublicCollectionRow[];
      };
      record_collection_view: {
        Args: { target_username: string };
        Returns: void;
      };
      get_collection_stats: {
        Args: Record<string, never>;
        Returns: CollectionStatsRow[];
      };
      get_public_showcase: {
        Args: { target_username: string };
        Returns: PublicShowcaseRow[];
      };
      set_showcase_slot: {
        Args: { p_collection_id: string; p_slot: number | null };
        Returns: void;
      };
      create_trade_offer: {
        Args: { p_target_collection_id: string; p_message?: string | null };
        Returns: string;
      };
      respond_trade_offer: {
        Args: { p_offer_id: string; p_action: string };
        Returns: void;
      };
      get_public_activity: {
        Args: { target_username: string; p_limit?: number };
        Returns: ActivityEventRpcRow[];
      };
      get_trade_alert_hits: {
        Args: Record<string, never>;
        Returns: TradeAlertHitRow[];
      };
      compare_collectors: {
        Args: { username_a: string; username_b: string };
        Returns: CompareCollectorsRow[];
      };
      snapshot_collection_value: {
        Args: { p_user_id: string };
        Returns: void;
      };
      card_display_market_cents: {
        Args: { p_card_id: string };
        Returns: number;
      };
      follow_user: {
        Args: { target_username: string };
        Returns: void;
      };
      unfollow_user: {
        Args: { target_username: string };
        Returns: void;
      };
      search_profiles: {
        Args: { q: string; p_limit?: number };
        Returns: ProfileSearchRow[];
      };
      get_following_activity: {
        Args: { p_limit?: number };
        Returns: FollowingActivityRow[];
      };
      get_profile_follow_stats: {
        Args: { target_username: string };
        Returns: ProfileFollowStatsRow[];
      };
      get_profile_follow_relationship: {
        Args: { target_username: string };
        Returns: ProfileFollowRelationshipRow[];
      };
      get_profile_followers: {
        Args: {
          target_username: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: ProfileSearchRow[];
      };
      get_profile_following: {
        Args: {
          target_username: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: ProfileSearchRow[];
      };
      get_suggested_collectors: {
        Args: { p_limit?: number };
        Returns: SuggestedCollectorRow[];
      };
      get_my_trade_offers: {
        Args: { p_limit?: number };
        Returns: TradeOfferContextRow[];
      };
      shop_held_quantity: {
        Args: { p_listing_id: string };
        Returns: number;
      };
      shop_collection_allocated_units: {
        Args: { p_collection_id: string };
        Returns: number;
      };
      shop_release_expired_reservations: {
        Args: Record<string, never>;
        Returns: number;
      };
      shop_finalize_paid_order: {
        Args: {
          p_order_id: string;
          p_stripe_checkout_session_id: string;
          p_stripe_payment_intent_id: string;
          p_buyer_email: string;
          p_shipping_name: string;
          p_shipping_address: Json;
        };
        Returns: undefined;
      };
      shop_cancel_pending_order: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      shop_mark_order_refunded: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PublicCollectionRow = {
  collection_id: string;
  user_id: string;
  card_id: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
  is_for_trade: boolean;
  is_graded: boolean;
  grading_company: string | null;
  grade: number | null;
  cert_number: string | null;
  slab_image_url: string | null;
  is_black_label: boolean;
  card_number: string | null;
  card_name: string;
  set_name: string | null;
  rarity: string | null;
  color: string | null;
  type: string | null;
  cost: string | null;
  power: string | null;
  counter: string | null;
  attribute: string | null;
  image_url: string | null;
  display_name: string | null;
  username: string;
  profile_id: string;
};

export type CollectionStatsRow = {
  total_cards_owned: number;
  unique_cards_owned: number;
  total_collection_views: number;
  cards_marked_for_trade: number;
  portfolio_value_cents?: number;
  portfolio_value_cents_30d_ago?: number | null;
  valued_cards_count?: number;
};

export type ActivityEventRpcRow = {
  id: string;
  event_type: string;
  payload: Json;
  created_at: string;
};

export type TradeAlertHitRow = {
  alert_id: string;
  card_id: string;
  card_name: string;
  owner_username: string;
  collection_id: string;
};

export type TradeOfferContextRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  direction: "incoming" | "outgoing" | string;
  counterpart_username: string;
  counterpart_display_name: string | null;
  counterpart_avatar_url: string | null;
  owner_username: string;
  target_collection_id: string;
  card_id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  image_url: string | null;
  quantity: number;
  condition: string | null;
  notes: string | null;
  is_for_trade: boolean;
  is_graded: boolean;
  grading_company: string | null;
  grade: number | null;
  is_black_label: boolean;
};

export type CompareCollectorsRow = {
  card_id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  owned_by_a: boolean;
  owned_by_b: boolean;
};

export type PublicShowcaseRow = {
  collection_id: string;
  showcase_slot: number;
  card_id: string;
  card_number: string | null;
  card_name: string;
  set_name: string | null;
  rarity: string | null;
  image_url: string | null;
  is_graded: boolean;
  grading_company: string | null;
  grade: number | null;
  cert_number: string | null;
  slab_image_url: string | null;
  is_black_label: boolean;
};

export type ProfileSearchRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
};

export type ProfileFollowStatsRow = {
  follower_count: number;
  following_count: number;
};

export type ProfileFollowRelationshipRow = {
  is_following: boolean;
  follows_you: boolean;
};

export type SuggestedCollectorRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
  shared_cards: number;
  follows_you: boolean;
};

export type FollowingActivityRow = {
  id: string;
  event_type: string;
  payload: Json;
  created_at: string;
  actor_id: string;
  actor_username: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
};
