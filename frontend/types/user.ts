export interface User {
  id: number;
  email: string;
  username: string;
  role: 'user' | 'moderator' | 'admin';
  trust_score: number;
  is_blocked: boolean;
  email_confirmed: boolean;
  created_at: string;
  avatar_url?: string;
  bio?: string;
  birth_date?: string;
  city?: string;
  telegram?: string;
  github?: string;
  website?: string;
  privacy_settings?: PrivacySettings;
}

export interface PrivacySettings {
  bio: boolean;
  birth_date: boolean;
  city: boolean;
  telegram: boolean;
  github: boolean;
  website: boolean;
}