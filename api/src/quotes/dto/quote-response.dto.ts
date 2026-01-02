import { ApiProperty } from '@nestjs/swagger';

export class QuoteResponseDto {
  @ApiProperty({ example: 'Shampoo 500ml', description: 'Product name' })
  productName: string;

  @ApiProperty({ example: 25.99, description: 'Product price' })
  price: number;

  @ApiProperty({ example: 1.2, description: 'Product weight in pounds' })
  weight: number;

  @ApiProperty({ example: 8.4, description: 'International shipping cost' })
  internationalShippingCost: number;

  @ApiProperty({ example: 17.59, description: 'Unit cost post shipping international' })
  unitCostPostShippingIntl: number;

  @ApiProperty({ example: 8.4, description: 'Revenue (price - unit cost post shipping)' })
  revenue: number;

  @ApiProperty({ example: 'SUMMER10', description: 'Applied coupon code', required: false })
  coupon?: string;
}
