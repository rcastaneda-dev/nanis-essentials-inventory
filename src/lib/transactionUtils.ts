/**
 * Maps transaction category keys to translation keys
 */
export const getTransactionCategoryTranslationKey = (category: string): string => {
  const categoryMap: Record<string, string> = {
    Packaging: 'packaging',
    Marketing: 'marketing',
    'Platform Fees': 'platformFees',
    'Payment Processing': 'paymentProcessing',
    Equipment: 'equipment',
    'Office Supplies': 'officeSupplies',
    'Professional Services': 'professionalServices',
    'Shipping Supplies': 'shippingSupplies',
    'Branding Materials': 'brandingMaterials',
    Other: 'other',
  };
  return categoryMap[category] || 'other';
};
