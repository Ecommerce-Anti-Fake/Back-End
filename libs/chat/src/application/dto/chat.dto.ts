import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatMessageResponseDto {
  @ApiProperty({ example: 'message-id' })
  id!: string;
  @ApiProperty({ example: 'thread-id' })
  threadId!: string;
  @ApiProperty({ example: 'user-id' })
  senderUserId!: string;
  @ApiPropertyOptional({ example: 'client-generated-message-id', nullable: true })
  clientMessageId!: string | null;
  @ApiProperty({ example: 'Nguyen Van A' })
  senderName!: string;
  @ApiProperty({ example: 'TEXT' })
  messageType!: string;
  @ApiProperty({ example: 'Shop tu van giup minh san pham nay.' })
  body!: string;
  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  sentAt!: Date;
}

export class ChatThreadResponseDto {
  @ApiProperty({ example: 'thread-id' })
  id!: string;
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;
  @ApiProperty({ example: 'Shop AntiFake' })
  shopName!: string;
  @ApiProperty({ example: 'buyer-user-id' })
  buyerUserId!: string;
  @ApiProperty({ example: 'Nguyen Van A' })
  buyerName!: string;
  @ApiProperty({ example: 'seller-user-id' })
  sellerUserId!: string;
  @ApiProperty({ example: 'Shop Owner' })
  sellerName!: string;
  @ApiPropertyOptional({ type: ChatMessageResponseDto })
  lastMessage!: ChatMessageResponseDto | null;
  @ApiProperty({ type: ChatMessageResponseDto, isArray: true })
  messages!: ChatMessageResponseDto[];
  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  createdAt!: Date;
}

export class StartChatThreadDto {
  @ApiPropertyOptional({ example: 'Shop tu van giup minh san pham nay.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  initialMessage?: string;
}

export class SendChatMessageDto {
  @ApiProperty({ example: 'Minh can them thong tin xac thuc.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
  @ApiPropertyOptional({ example: 'client-generated-message-id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;
}

