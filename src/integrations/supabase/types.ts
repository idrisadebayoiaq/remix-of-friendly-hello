export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_dismissals: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_replies: {
        Row: {
          announcement_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_replies_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          title: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string | null
          comments_count: number | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_deleted: boolean | null
          is_flagged: boolean | null
          likes_count: number | null
          media_type: string
          shares_count: number | null
          tags: string[] | null
          thumbnail_url: string | null
          user_id: string
          video_duration: number | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_flagged?: boolean | null
          likes_count?: number | null
          media_type?: string
          shares_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          user_id: string
          video_duration?: number | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          is_flagged?: boolean | null
          likes_count?: number | null
          media_type?: string
          shares_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          user_id?: string
          video_duration?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      connection_messages: {
        Row: {
          connection_id: string
          content: string
          created_at: string
          deleted_for_everyone_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_deleted_for_everyone: boolean | null
          is_read: boolean | null
          message_type: string
          reply_to_message_id: string | null
          sender_id: string
        }
        Insert: {
          connection_id: string
          content: string
          created_at?: string
          deleted_for_everyone_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_deleted_for_everyone?: boolean | null
          is_read?: boolean | null
          message_type?: string
          reply_to_message_id?: string | null
          sender_id: string
        }
        Update: {
          connection_id?: string
          content?: string
          created_at?: string
          deleted_for_everyone_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_deleted_for_everyone?: boolean | null
          is_read?: boolean | null
          message_type?: string
          reply_to_message_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "connection_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["connection_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["connection_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["connection_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      connection_timeline_events: {
        Row: {
          connection_id: string
          created_at: string
          event_type: string
          id: string
          title: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          event_type: string
          id?: string
          title: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_timeline_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          dating_started_at: string | null
          friendship_started_at: string | null
          id: string
          married_at: string | null
          matchmaking_unlocked_at: string | null
          origin_type: string
          relationship_track: string
          source_invite_id: string | null
          status: string
          upgraded_to_romantic: boolean
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          dating_started_at?: string | null
          friendship_started_at?: string | null
          id?: string
          married_at?: string | null
          matchmaking_unlocked_at?: string | null
          origin_type?: string
          relationship_track?: string
          source_invite_id?: string | null
          status?: string
          upgraded_to_romantic?: boolean
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          dating_started_at?: string | null
          friendship_started_at?: string | null
          id?: string
          married_at?: string | null
          matchmaking_unlocked_at?: string | null
          origin_type?: string
          relationship_track?: string
          source_invite_id?: string | null
          status?: string
          upgraded_to_romantic?: boolean
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_source_invite_id_fkey"
            columns: ["source_invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      content_appeals: {
        Row: {
          admin_response: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_prompt_responses: {
        Row: {
          connection_id: string | null
          created_at: string
          id: string
          prompt_id: string
          response_text: string
          sent_to_partner: boolean
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          id?: string
          prompt_id: string
          response_text: string
          sent_to_partner?: boolean
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          id?: string
          prompt_id?: string
          response_text?: string
          sent_to_partner?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_prompt_responses_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "daily_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_prompts: {
        Row: {
          created_at: string
          for_date: string
          id: string
          prompt_text: string
          prompt_type: string
        }
        Insert: {
          created_at?: string
          for_date: string
          id?: string
          prompt_text: string
          prompt_type?: string
        }
        Update: {
          created_at?: string
          for_date?: string
          id?: string
          prompt_text?: string
          prompt_type?: string
        }
        Relationships: []
      }
      daily_question_answers: {
        Row: {
          answer: string
          connection_id: string
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer: string
          connection_id: string
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer?: string
          connection_id?: string
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_question_answers_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "daily_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_questions: {
        Row: {
          category: string | null
          created_at: string
          id: string
          question: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: []
      }
      dating_likes: {
        Row: {
          created_at: string
          id: string
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      dating_profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          interests: string[] | null
          is_active: boolean
          location: string | null
          looking_for: string
          photos: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          is_active?: boolean
          location?: string | null
          looking_for?: string
          photos?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          is_active?: boolean
          location?: string | null
          looking_for?: string
          photos?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dating_requests: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dating_requests_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      game_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          question_index: number
          session_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question_index: number
          session_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question_index?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          connection_id: string
          created_at: string
          created_by: string
          game_type: string
          id: string
          status: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          created_by: string
          game_type: string
          id?: string
          status?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          created_by?: string
          game_type?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invite_type: Database["public"]["Enums"]["invite_type"]
          message: string | null
          receiver_email: string
          receiver_id: string | null
          receiver_name: string
          responded_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["invite_status"]
          target_date: string | null
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invite_type: Database["public"]["Enums"]["invite_type"]
          message?: string | null
          receiver_email: string
          receiver_id?: string | null
          receiver_name?: string
          responded_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          target_date?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invite_type?: Database["public"]["Enums"]["invite_type"]
          message?: string | null
          receiver_email?: string
          receiver_id?: string | null
          receiver_name?: string
          responded_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          target_date?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      marriage_sessions: {
        Row: {
          answers: Json
          connection_id: string
          created_at: string
          decision: string | null
          id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          connection_id: string
          created_at?: string
          decision?: string | null
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          connection_id?: string
          created_at?: string
          decision?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marriage_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_sessions: {
        Row: {
          answers: Json
          connection_id: string
          created_at: string
          decision: string | null
          id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          connection_id: string
          created_at?: string
          decision?: string | null
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          connection_id?: string
          created_at?: string
          decision?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          caption: string | null
          connection_id: string
          created_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          connection_id: string
          created_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          connection_id?: string
          created_at?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      message_deletions: {
        Row: {
          deleted_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_deletions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "connection_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "connection_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_flagged: boolean | null
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_flagged?: boolean | null
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_flagged?: boolean | null
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          dob_public: boolean | null
          email: string
          full_name: string
          id: string
          interests: string[] | null
          is_banned: boolean | null
          is_deleted: boolean | null
          love_language: string | null
          partner_user_id: string | null
          preferred_currency: string | null
          profile_visible: boolean | null
          relationship_status:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          timezone: string | null
          trusted_contact_name: string | null
          trusted_contact_phone: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dob_public?: boolean | null
          email: string
          full_name?: string
          id?: string
          interests?: string[] | null
          is_banned?: boolean | null
          is_deleted?: boolean | null
          love_language?: string | null
          partner_user_id?: string | null
          preferred_currency?: string | null
          profile_visible?: boolean | null
          relationship_status?:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          timezone?: string | null
          trusted_contact_name?: string | null
          trusted_contact_phone?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dob_public?: boolean | null
          email?: string
          full_name?: string
          id?: string
          interests?: string[] | null
          is_banned?: boolean | null
          is_deleted?: boolean | null
          love_language?: string | null
          partner_user_id?: string | null
          preferred_currency?: string | null
          profile_visible?: boolean | null
          relationship_status?:
            | Database["public"]["Enums"]["relationship_status"]
            | null
          timezone?: string | null
          trusted_contact_name?: string | null
          trusted_contact_phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          created_at: string
          id: string
          inputs: Json | null
          quiz_type: string
          results: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json | null
          quiz_type: string
          results?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json | null
          quiz_type?: string
          results?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          remind_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          remind_at: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          remind_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string | null
        }
        Relationships: []
      }
      safety_tips: {
        Row: {
          created_at: string
          id: string
          tip_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          tip_text: string
        }
        Update: {
          created_at?: string
          id?: string
          tip_text?: string
        }
        Relationships: []
      }
      shared_songs: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          platform: string
          sender_id: string
          title: string | null
          url: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          platform?: string
          sender_id: string
          title?: string | null
          url: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          platform?: string
          sender_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_songs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean | null
          is_read: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean | null
          is_read?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean | null
          is_read?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      surprise_messages: {
        Row: {
          connection_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean | null
          is_revealed: boolean | null
          receiver_id: string | null
          reveal_at: string
          revealed_at: string | null
          sender_id: string
        }
        Insert: {
          connection_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_revealed?: boolean | null
          receiver_id?: string | null
          reveal_at: string
          revealed_at?: string | null
          sender_id: string
        }
        Update: {
          connection_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          is_revealed?: boolean | null
          receiver_id?: string | null
          reveal_at?: string
          revealed_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "surprise_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_connection_requests: boolean | null
          allow_requests_when_dating: boolean | null
          created_at: string
          daily_question_notifications: boolean | null
          date_safety_mode: boolean | null
          email_notifications: boolean | null
          has_seen_onboarding: boolean | null
          id: string
          install_prompt_cooldown_days: number | null
          install_prompt_dismissed_at: string | null
          install_prompt_installed: boolean | null
          invite_notifications: boolean | null
          last_love_tip: string | null
          last_love_tip_at: string | null
          onboarding_completed_at: string | null
          preferred_install_prompt: boolean | null
          profile_visibility: boolean | null
          push_appeals: boolean | null
          push_community: boolean | null
          push_connection_requests: boolean | null
          push_daily_questions: boolean | null
          push_dating_requests: boolean | null
          push_invites: boolean | null
          push_messages: boolean | null
          push_reports: boolean | null
          sound_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_connection_requests?: boolean | null
          allow_requests_when_dating?: boolean | null
          created_at?: string
          daily_question_notifications?: boolean | null
          date_safety_mode?: boolean | null
          email_notifications?: boolean | null
          has_seen_onboarding?: boolean | null
          id?: string
          install_prompt_cooldown_days?: number | null
          install_prompt_dismissed_at?: string | null
          install_prompt_installed?: boolean | null
          invite_notifications?: boolean | null
          onboarding_completed_at?: string | null
          preferred_install_prompt?: boolean | null
          profile_visibility?: boolean | null
          push_appeals?: boolean | null
          push_community?: boolean | null
          push_connection_requests?: boolean | null
          push_daily_questions?: boolean | null
          push_dating_requests?: boolean | null
          push_invites?: boolean | null
          push_messages?: boolean | null
          push_reports?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_connection_requests?: boolean | null
          allow_requests_when_dating?: boolean | null
          created_at?: string
          daily_question_notifications?: boolean | null
          date_safety_mode?: boolean | null
          email_notifications?: boolean | null
          has_seen_onboarding?: boolean | null
          id?: string
          install_prompt_cooldown_days?: number | null
          install_prompt_dismissed_at?: string | null
          install_prompt_installed?: boolean | null
          invite_notifications?: boolean | null
          onboarding_completed_at?: string | null
          preferred_install_prompt?: boolean | null
          profile_visibility?: boolean | null
          push_appeals?: boolean | null
          push_community?: boolean | null
          push_connection_requests?: boolean | null
          push_daily_questions?: boolean | null
          push_dating_requests?: boolean | null
          push_invites?: boolean | null
          push_messages?: boolean | null
          push_reports?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: Json }
      are_connected: {
        Args: { _user1: string; _user2: string }
        Returns: boolean
      }
      decline_invite: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _user1: string; _user2: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      connection_request_status: "pending" | "accepted" | "declined"
      invite_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      invite_type:
        | "be_my_valentine"
        | "date_proposal"
        | "anniversary_surprise"
        | "custom_message"
      relationship_status:
        | "single"
        | "talking_stage"
        | "dating"
        | "engaged"
        | "married"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      connection_request_status: ["pending", "accepted", "declined"],
      invite_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      invite_type: [
        "be_my_valentine",
        "date_proposal",
        "anniversary_surprise",
        "custom_message",
      ],
      relationship_status: [
        "single",
        "talking_stage",
        "dating",
        "engaged",
        "married",
      ],
    },
  },
} as const
