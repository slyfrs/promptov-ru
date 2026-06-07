export interface Tag {
  id: number;
  name: string;
  name_ru?: string;
  name_en?: string;
  type: 'category' | 'ai_model';
  icon?: string;
}