// frontend/types/api.ts
import { Prompt } from './prompt';
import { Comment } from './comment';
import { Tag } from './tag';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface PromptsResponse {
  prompts: Prompt[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface TagsResponse {
  tags: Tag[];
}

export interface LikeResponse {
  liked: boolean;
  likes_count: number;
}

export interface LeaderboardUser {
  rank: number;
  user_id: number;
  username: string;
  avatar_url: string;
  value: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardUser[];
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pages: number;
  unread_count: number;
}