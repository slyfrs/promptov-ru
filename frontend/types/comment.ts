import { User } from './user';

export interface Comment {
  id: number;
  content: string;
  is_approved: boolean;
  created_at: string;
  user: Pick<User, 'id' | 'username'>;
  prompt_id: number;
}