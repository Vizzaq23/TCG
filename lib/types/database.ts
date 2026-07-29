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
