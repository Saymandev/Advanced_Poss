import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class ReceivedItemDto {
  @ApiProperty({ example: 'item-id-123' })
  @IsString()
  itemId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivedItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  receivedItems: ReceivedItemDto[];
}


