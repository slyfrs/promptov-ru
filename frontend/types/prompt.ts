import { Tag } from './tag';
import { User } from './user';

export type PromptStatus = 'private' | 'pending' | 'published' | 'rejected';

export interface Prompt {
  id: number;
  title: string;
  content: string;
  description: string;
  example_usage: string;
  status: PromptStatus;
  theme: string;
  theme_id?: number;
  theme_name?: string;
  theme_icon?: string;
  result_image_url?: string;
  custom_image_url: string;
  version: number;
  parent_prompt_id?: number;
  tags: Tag[];
  likes_count: number;
  ratings_count: number;
  comments_count?: number;
  user_liked?: boolean;
  user?: Pick<User, 'id' | 'username' | 'avatar_url'>;
  created_at: string;
  published_at: string;
  updated_at: string;
}