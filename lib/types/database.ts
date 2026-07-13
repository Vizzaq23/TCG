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
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
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
          created_at?: string;
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
};
