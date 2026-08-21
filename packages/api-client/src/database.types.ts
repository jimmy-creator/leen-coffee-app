export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          additional_number: string | null;
          building_number: string | null;
          city: string;
          created_at: string;
          district: string;
          id: number;
          is_default: boolean;
          label: string;
          lat: number | null;
          lng: number | null;
          notes: string | null;
          postal_code: string | null;
          street: string;
          user_id: string;
        };
        Insert: {
          additional_number?: string | null;
          building_number?: string | null;
          city: string;
          created_at?: string;
          district: string;
          id?: never;
          is_default?: boolean;
          label?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          postal_code?: string | null;
          street: string;
          user_id: string;
        };
        Update: {
          additional_number?: string | null;
          building_number?: string | null;
          city?: string;
          created_at?: string;
          district?: string;
          id?: never;
          is_default?: boolean;
          label?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          postal_code?: string | null;
          street?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'addresses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      banners: {
        Row: {
          ends_at: string | null;
          id: number;
          image_url: string | null;
          is_active: boolean;
          kicker_ar: string | null;
          kicker_en: string | null;
          sort_order: number;
          starts_at: string | null;
          subtitle_ar: string | null;
          subtitle_en: string | null;
          target_path: string | null;
          title_ar: string | null;
          title_en: string | null;
        };
        Insert: {
          ends_at?: string | null;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          kicker_ar?: string | null;
          kicker_en?: string | null;
          sort_order?: number;
          starts_at?: string | null;
          subtitle_ar?: string | null;
          subtitle_en?: string | null;
          target_path?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
        };
        Update: {
          ends_at?: string | null;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          kicker_ar?: string | null;
          kicker_en?: string | null;
          sort_order?: number;
          starts_at?: string | null;
          subtitle_ar?: string | null;
          subtitle_en?: string | null;
          target_path?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          created_at: string;
          grind: string;
          id: number;
          product_id: number;
          qty: number;
          user_id: string;
          weight_g: number;
        };
        Insert: {
          created_at?: string;
          grind?: string;
          id?: never;
          product_id: number;
          qty?: number;
          user_id: string;
          weight_g?: number;
        };
        Update: {
          created_at?: string;
          grind?: string;
          id?: never;
          product_id?: number;
          qty?: number;
          user_id?: string;
          weight_g?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'cart_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: number;
          is_active: boolean;
          name_ar: string | null;
          name_en: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          id?: never;
          is_active?: boolean;
          name_ar?: string | null;
          name_en: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          name_ar?: string | null;
          name_en?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      loyalty_accounts: {
        Row: {
          lifetime_points: number;
          points: number;
          tier: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          lifetime_points?: number;
          points?: number;
          tier?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          lifetime_points?: number;
          points?: number;
          tier?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'loyalty_accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      loyalty_ledger: {
        Row: {
          created_at: string;
          delta: number;
          id: number;
          order_id: number | null;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          id?: never;
          order_id?: number | null;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          id?: never;
          order_id?: number | null;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'loyalty_ledger_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'loyalty_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      merchants: {
        Row: {
          about_ar: string | null;
          about_en: string | null;
          city_ar: string | null;
          city_en: string | null;
          commission_rate: number;
          cover_url: string | null;
          created_at: string;
          delivery_radius_km: number;
          district_ar: string | null;
          district_en: string | null;
          established_year: number | null;
          eta_max_minutes: number;
          eta_min_minutes: number;
          id: number;
          is_active: boolean;
          is_open: boolean;
          lat: number | null;
          lng: number | null;
          logo_url: string | null;
          min_order_minor: number;
          name_ar: string | null;
          name_en: string;
          owner_id: string | null;
          phone: string | null;
          rating: number;
          rating_count: number;
          tagline_ar: string | null;
          tagline_en: string | null;
          updated_at: string;
        };
        Insert: {
          about_ar?: string | null;
          about_en?: string | null;
          city_ar?: string | null;
          city_en?: string | null;
          commission_rate?: number;
          cover_url?: string | null;
          created_at?: string;
          delivery_radius_km?: number;
          district_ar?: string | null;
          district_en?: string | null;
          established_year?: number | null;
          eta_max_minutes?: number;
          eta_min_minutes?: number;
          id?: never;
          is_active?: boolean;
          is_open?: boolean;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          min_order_minor?: number;
          name_ar?: string | null;
          name_en: string;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          rating_count?: number;
          tagline_ar?: string | null;
          tagline_en?: string | null;
          updated_at?: string;
        };
        Update: {
          about_ar?: string | null;
          about_en?: string | null;
          city_ar?: string | null;
          city_en?: string | null;
          commission_rate?: number;
          cover_url?: string | null;
          created_at?: string;
          delivery_radius_km?: number;
          district_ar?: string | null;
          district_en?: string | null;
          established_year?: number | null;
          eta_max_minutes?: number;
          eta_min_minutes?: number;
          id?: never;
          is_active?: boolean;
          is_open?: boolean;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          min_order_minor?: number;
          name_ar?: string | null;
          name_en?: string;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          rating_count?: number;
          tagline_ar?: string | null;
          tagline_en?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'merchants_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body_ar: string | null;
          body_en: string | null;
          created_at: string;
          id: number;
          path: string | null;
          read_at: string | null;
          title_ar: string | null;
          title_en: string;
          user_id: string;
        };
        Insert: {
          body_ar?: string | null;
          body_en?: string | null;
          created_at?: string;
          id?: never;
          path?: string | null;
          read_at?: string | null;
          title_ar?: string | null;
          title_en: string;
          user_id: string;
        };
        Update: {
          body_ar?: string | null;
          body_en?: string | null;
          created_at?: string;
          id?: never;
          path?: string | null;
          read_at?: string | null;
          title_ar?: string | null;
          title_en?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          grind: string;
          id: number;
          line_total_minor: number;
          name_ar: string | null;
          name_en: string;
          product_id: number | null;
          qty: number;
          roasted_on: string | null;
          sub_order_id: number;
          unit_price_minor: number;
          weight_g: number;
        };
        Insert: {
          grind: string;
          id?: never;
          line_total_minor: number;
          name_ar?: string | null;
          name_en: string;
          product_id?: number | null;
          qty: number;
          roasted_on?: string | null;
          sub_order_id: number;
          unit_price_minor: number;
          weight_g: number;
        };
        Update: {
          grind?: string;
          id?: never;
          line_total_minor?: number;
          name_ar?: string | null;
          name_en?: string;
          product_id?: number | null;
          qty?: number;
          roasted_on?: string | null;
          sub_order_id?: number;
          unit_price_minor?: number;
          weight_g?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_sub_order_id_fkey';
            columns: ['sub_order_id'];
            isOneToOne: false;
            referencedRelation: 'sub_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          address_id: number | null;
          address_snapshot: Json | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string;
          customer_id: string;
          delivered_at: string | null;
          delivery_minor: number;
          discount_minor: number;
          fulfilment: string;
          id: number;
          payment_method: string;
          payment_status: string;
          placed_at: string;
          points_earned: number;
          promo_code: string | null;
          status: string;
          subtotal_minor: number;
          total_minor: number;
          vat_minor: number;
        };
        Insert: {
          address_id?: number | null;
          address_snapshot?: Json | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          code: string;
          customer_id: string;
          delivered_at?: string | null;
          delivery_minor?: number;
          discount_minor?: number;
          fulfilment?: string;
          id?: never;
          payment_method: string;
          payment_status?: string;
          placed_at?: string;
          points_earned?: number;
          promo_code?: string | null;
          status?: string;
          subtotal_minor: number;
          total_minor: number;
          vat_minor?: number;
        };
        Update: {
          address_id?: number | null;
          address_snapshot?: Json | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          code?: string;
          customer_id?: string;
          delivered_at?: string | null;
          delivery_minor?: number;
          discount_minor?: number;
          fulfilment?: string;
          id?: never;
          payment_method?: string;
          payment_status?: string;
          placed_at?: string;
          points_earned?: number;
          promo_code?: string | null;
          status?: string;
          subtotal_minor?: number;
          total_minor?: number;
          vat_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_address_id_fkey';
            columns: ['address_id'];
            isOneToOne: false;
            referencedRelation: 'addresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          about_ar: string | null;
          about_en: string | null;
          altitude_ar: string | null;
          altitude_en: string | null;
          base_price_minor: number;
          category_id: number | null;
          created_at: string;
          id: number;
          image_url: string | null;
          is_active: boolean;
          is_featured: boolean;
          merchant_id: number;
          name_ar: string | null;
          name_en: string;
          notes_ar: string | null;
          notes_en: string | null;
          origin_ar: string | null;
          origin_en: string | null;
          process: string | null;
          roast_level: string;
          roasted_on: string | null;
          search_key: string | null;
          stock_qty: number;
          updated_at: string;
          variety_ar: string | null;
          variety_en: string | null;
        };
        Insert: {
          about_ar?: string | null;
          about_en?: string | null;
          altitude_ar?: string | null;
          altitude_en?: string | null;
          base_price_minor: number;
          category_id?: number | null;
          created_at?: string;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          merchant_id: number;
          name_ar?: string | null;
          name_en: string;
          notes_ar?: string | null;
          notes_en?: string | null;
          origin_ar?: string | null;
          origin_en?: string | null;
          process?: string | null;
          roast_level?: string;
          roasted_on?: string | null;
          search_key?: string | null;
          stock_qty?: number;
          updated_at?: string;
          variety_ar?: string | null;
          variety_en?: string | null;
        };
        Update: {
          about_ar?: string | null;
          about_en?: string | null;
          altitude_ar?: string | null;
          altitude_en?: string | null;
          base_price_minor?: number;
          category_id?: number | null;
          created_at?: string;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          merchant_id?: number;
          name_ar?: string | null;
          name_en?: string;
          notes_ar?: string | null;
          notes_en?: string | null;
          origin_ar?: string | null;
          origin_en?: string | null;
          process?: string | null;
          roast_level?: string;
          roasted_on?: string | null;
          search_key?: string | null;
          stock_qty?: number;
          updated_at?: string;
          variety_ar?: string | null;
          variety_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          locale: string;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      promo_codes: {
        Row: {
          code: string;
          discount_minor: number | null;
          discount_percent: number | null;
          id: number;
          is_active: boolean;
          max_discount_minor: number | null;
          max_uses: number | null;
          min_order_minor: number;
          uses: number;
          valid_from: string;
          valid_until: string | null;
        };
        Insert: {
          code: string;
          discount_minor?: number | null;
          discount_percent?: number | null;
          id?: never;
          is_active?: boolean;
          max_discount_minor?: number | null;
          max_uses?: number | null;
          min_order_minor?: number;
          uses?: number;
          valid_from?: string;
          valid_until?: string | null;
        };
        Update: {
          code?: string;
          discount_minor?: number | null;
          discount_percent?: number | null;
          id?: never;
          is_active?: boolean;
          max_discount_minor?: number | null;
          max_uses?: number | null;
          min_order_minor?: number;
          uses?: number;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: number;
          platform: string | null;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          platform?: string | null;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          platform?: string | null;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          body: string | null;
          created_at: string;
          id: number;
          merchant_id: number;
          order_id: number | null;
          product_id: number;
          rating: number;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: never;
          merchant_id: number;
          order_id?: number | null;
          product_id: number;
          rating: number;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: never;
          merchant_id?: number;
          order_id?: number | null;
          product_id?: number;
          rating?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reward_redemptions: {
        Row: {
          consumed_order_id: number | null;
          id: number;
          points_spent: number;
          redeemed_at: string;
          reward_id: number;
          user_id: string;
        };
        Insert: {
          consumed_order_id?: number | null;
          id?: never;
          points_spent: number;
          redeemed_at?: string;
          reward_id: number;
          user_id: string;
        };
        Update: {
          consumed_order_id?: number | null;
          id?: never;
          points_spent?: number;
          redeemed_at?: string;
          reward_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reward_redemptions_consumed_order_id_fkey';
            columns: ['consumed_order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reward_redemptions_reward_id_fkey';
            columns: ['reward_id'];
            isOneToOne: false;
            referencedRelation: 'rewards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reward_redemptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rewards: {
        Row: {
          id: number;
          is_active: boolean;
          kind: string;
          name_ar: string | null;
          name_en: string;
          points_cost: number;
          sort_order: number;
        };
        Insert: {
          id?: never;
          is_active?: boolean;
          kind?: string;
          name_ar?: string | null;
          name_en: string;
          points_cost: number;
          sort_order?: number;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          kind?: string;
          name_ar?: string | null;
          name_en?: string;
          points_cost?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      riders: {
        Row: {
          created_at: string;
          id: string;
          is_approved: boolean;
          is_online: boolean;
          lat: number | null;
          lng: number | null;
          location_updated_at: string | null;
          national_id: string | null;
          plate: string | null;
          rating: number;
          rating_count: number;
          vehicle: string | null;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_approved?: boolean;
          is_online?: boolean;
          lat?: number | null;
          lng?: number | null;
          location_updated_at?: string | null;
          national_id?: string | null;
          plate?: string | null;
          rating?: number;
          rating_count?: number;
          vehicle?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          is_online?: boolean;
          lat?: number | null;
          lng?: number | null;
          location_updated_at?: string | null;
          national_id?: string | null;
          plate?: string | null;
          rating?: number;
          rating_count?: number;
          vehicle?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'riders_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      sub_orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          commission_minor: number;
          confirmed_at: string | null;
          created_at: string;
          delivered_at: string | null;
          eta_minutes: number | null;
          id: number;
          merchant_id: number;
          order_id: number;
          picked_up_at: string | null;
          ready_at: string | null;
          rider_fee_minor: number;
          rider_id: string | null;
          status: string;
          subtotal_minor: number;
        };
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          commission_minor?: number;
          confirmed_at?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          eta_minutes?: number | null;
          id?: never;
          merchant_id: number;
          order_id: number;
          picked_up_at?: string | null;
          ready_at?: string | null;
          rider_fee_minor?: number;
          rider_id?: string | null;
          status?: string;
          subtotal_minor: number;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          commission_minor?: number;
          confirmed_at?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          eta_minutes?: number | null;
          id?: never;
          merchant_id?: number;
          order_id?: number;
          picked_up_at?: string | null;
          ready_at?: string | null;
          rider_fee_minor?: number;
          rider_id?: string | null;
          status?: string;
          subtotal_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sub_orders_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sub_orders_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sub_orders_rider_id_fkey';
            columns: ['rider_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_plans: {
        Row: {
          description_ar: string | null;
          description_en: string | null;
          id: number;
          is_active: boolean;
          name_ar: string | null;
          name_en: string;
          perks_ar: string[];
          perks_en: string[];
          price_minor: number;
          slug: string;
          sort_order: number;
        };
        Insert: {
          description_ar?: string | null;
          description_en?: string | null;
          id?: never;
          is_active?: boolean;
          name_ar?: string | null;
          name_en: string;
          perks_ar?: string[];
          perks_en?: string[];
          price_minor: number;
          slug: string;
          sort_order?: number;
        };
        Update: {
          description_ar?: string | null;
          description_en?: string | null;
          id?: never;
          is_active?: boolean;
          name_ar?: string | null;
          name_en?: string;
          perks_ar?: string[];
          perks_en?: string[];
          price_minor?: number;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          address_id: number | null;
          cancelled_at: string | null;
          created_at: string;
          customer_id: string;
          frequency: string;
          grind: string;
          id: number;
          merchant_id: number | null;
          next_delivery_on: string | null;
          plan_id: number;
          status: string;
        };
        Insert: {
          address_id?: number | null;
          cancelled_at?: string | null;
          created_at?: string;
          customer_id: string;
          frequency?: string;
          grind?: string;
          id?: never;
          merchant_id?: number | null;
          next_delivery_on?: string | null;
          plan_id: number;
          status?: string;
        };
        Update: {
          address_id?: number | null;
          cancelled_at?: string | null;
          created_at?: string;
          customer_id?: string;
          frequency?: string;
          grind?: string;
          id?: never;
          merchant_id?: number | null;
          next_delivery_on?: string | null;
          plan_id?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_address_id_fkey';
            columns: ['address_id'];
            isOneToOne: false;
            referencedRelation: 'addresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_promo: {
        Args: { p_code: string; p_subtotal_minor: number };
        Returns: number;
      };
      order_tracking: {
        Args: { p_order_code: string };
        Returns: {
          code: string;
          eta_minutes: number;
          merchant_name_ar: string;
          merchant_name_en: string;
          merchant_phone: string;
          order_id: number;
          placed_at: string;
          rider_lat: number;
          rider_lng: number;
          rider_name: string;
          rider_rating: number;
          rider_vehicle: string;
          status: string;
          sub_order_status: string;
          total_minor: number;
        }[];
      };
      place_order: {
        Args: {
          p_address_id?: number;
          p_fulfilment: string;
          p_payment_method: string;
          p_promo_code?: string;
        };
        Returns: {
          order_code: string;
          order_id: number;
          total_minor: number;
        }[];
      };
      preview_cart_total: {
        Args: { p_fulfilment?: string; p_promo_code?: string };
        Returns: {
          delivery_minor: number;
          discount_minor: number;
          points_earned: number;
          subtotal_minor: number;
          total_minor: number;
          vat_minor: number;
        }[];
      };
      redeem_reward: { Args: { p_reward_id: number }; Returns: number };
      rider_accept: { Args: { p_sub_order_id: number }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
