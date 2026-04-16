import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaService } from './application/services/media.service';
import { CloudinaryService } from './infrastructure/cloudinary/cloudinary.service';
import { MediaRepository } from './infrastructure/persistence/media.repository';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [CloudinaryService, MediaRepository, MediaService],
  exports: [CloudinaryService, MediaRepository, MediaService],
})
export class MediaModule {}
