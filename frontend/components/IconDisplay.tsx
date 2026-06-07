'use client';

import * as Icons from 'lucide-react';

interface IconDisplayProps {
  name: string;
  size?: number;
  className?: string;
}

export default function IconDisplay({ name, size = 20, className = '' }: IconDisplayProps) {
  // Динамически получаем компонент иконки
  const LucideIcon = (Icons as any)[name];
  
  if (!LucideIcon) {
    // Если иконка не найдена, показываем эмодзи по умолчанию
    return <span className="text-lg">🤖</span>;
  }
  
  return <LucideIcon size={size} className={className} />;
}