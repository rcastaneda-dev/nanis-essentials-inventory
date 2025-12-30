import { Category } from '../types/models';

/**
 * Maps category keys to translation keys
 */
export const getCategoryTranslationKey = (category: Category): string => {
  const categoryMap: Record<Category, string> = {
    'Hair Care': 'hairCare',
    'Body Care': 'bodyCare',
    Makeup: 'makeup',
    Fragrance: 'fragrance',
    'Skin Care': 'skinCare',
    Other: 'other',
  };
  return categoryMap[category] || 'other';
};
