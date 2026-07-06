import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ChatMessageAttachmentResponseDto {
  @ApiProperty({ example: 'attachment-id' })
  id!: string;

  @ApiProperty({ example: 'IMAGE', enum: ['IMAGE', 'FILE'] })
  type!: 'IMAGE' | 'FILE';

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1/chat/thread-1/photo.jpg' })
  url!: string;

  @ApiProperty({ example: 'photo.jpg' })
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: 245760 })
  sizeBytes!: number;
}

export class ChatMessageAttachmentInputDto {
  @ApiProperty({ example: 'IMAGE', enum: ['IMAGE', 'FILE'] })
  @IsIn(['IMAGE', 'FILE'])
  type!: 'IMAGE' | 'FILE';

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1/chat/thread-1/photo.jpg' })
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  url!: string;

  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ example: 245760 })
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  sizeBytes!: number;
}

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
  @ApiPropertyOptional({ example: 'Shop tu van giup minh san pham nay.', nullable: true })
  body!: string | null;
  @ApiProperty({ type: ChatMessageAttachmentResponseDto, isArray: true })
  attachments!: ChatMessageAttachmentResponseDto[];
  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  sentAt!: Date;
}

export class ChatThreadListItemMessageResponseDto {
  @ApiProperty({ example: 'message-id' })
  id!: string;

  @ApiPropertyOptional({ example: 'client-generated-message-id', nullable: true })
  clientMessageId!: string | null;

  @ApiProperty({ example: 'TEXT' })
  messageType!: string;

  @ApiPropertyOptional({ example: 'Shop tu van giup minh san pham nay.', nullable: true })
  body!: string | null;

  @ApiProperty({ type: ChatMessageAttachmentResponseDto, isArray: true })
  attachments!: ChatMessageAttachmentResponseDto[];

  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  sentAt!: Date;
}

export class ChatThreadListItemResponseDto {
  @ApiProperty({ example: 'thread-id' })
  id!: string;

  @ApiProperty({ example: 'shop-id' })
  chatUserID!: string;

  @ApiProperty({ example: 'Shop AntiFake' })
  chatUserName!: string;

  @ApiProperty({
    type: ChatThreadListItemMessageResponseDto,
    isArray: true,
  })
  lastMessage!: ChatThreadListItemMessageResponseDto[];

  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  createdAt!: Date;
}

export class ChatThreadPageInfoDto {
  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: true })
  hasMoreBefore!: boolean;

  @ApiPropertyOptional({
    example: '2026-06-04T09:51:05.445Z|message-id',
    nullable: true,
  })
  beforeCursor!: string | null;
}

export class ChatThreadDetailMessageResponseDto {
  @ApiProperty({ example: 'message-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  senderUserId!: string;

  @ApiPropertyOptional({ example: 'client-generated-message-id', nullable: true })
  clientMessageId!: string | null;

  @ApiProperty({ example: 'TEXT' })
  messageType!: string;

  @ApiPropertyOptional({ example: 'RT3 smoke init 1780566663734', nullable: true })
  body!: string | null;

  @ApiProperty({ type: ChatMessageAttachmentResponseDto, isArray: true })
  attachments!: ChatMessageAttachmentResponseDto[];

  @ApiProperty({ example: '2026-06-04T09:51:05.445Z' })
  sentAt!: Date;
}

export class ChatThreadDetailResponseDto {
  @ApiProperty({ example: 'thread-id' })
  id!: string;

  @ApiProperty({ example: 'shop-id-or-user-id' })
  chatUserID!: string;

  @ApiProperty({ example: 'Shop AntiFake' })
  chatUserName!: string;

  @ApiProperty({
    type: ChatThreadDetailMessageResponseDto,
    isArray: true,
  })
  messages!: ChatThreadDetailMessageResponseDto[];

  @ApiProperty({ type: ChatThreadPageInfoDto })
  pageInfo!: ChatThreadPageInfoDto;

  @ApiProperty({ example: '2026-06-04T09:51:04.984Z' })
  createdAt!: Date;
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

export class StartChatThreadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'chat-thread-id' })
  threadId!: string;
}

export class SendChatMessageDto {
  @ApiPropertyOptional({ example: 'Minh can them thong tin xac thuc.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;
  @ApiPropertyOptional({ example: 'client-generated-message-id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;

  @ApiPropertyOptional({ type: ChatMessageAttachmentInputDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageAttachmentInputDto)
  attachments?: ChatMessageAttachmentInputDto[];
}
