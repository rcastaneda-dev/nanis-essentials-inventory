export interface Item {
  id: string;
  name: string;
  description: string;
  category: string;
  count: number;
  totalCost: number;
  minPrice: number;
  maxPrice: number;
  competitorAPrice?: number;
  competitorBPrice?: number;
  minProfit: number;
  maxProfit: number;
  createdAt: Date;
}
