import { BadRequestException, Injectable } from '@nestjs/common';
import { MediaService } from '@media';

@Injectable()
export class GetKycUploadSignaturesUseCase {
  constructor(private readonly mediaService: MediaService) {}

  async execute(input: {
    userId: string;
    items: Array<{
      side: 'FRONT' | 'BACK';
    }>;
  }) {
    const uniqueSides = new Set(input.items.map((item) => item.side));
    if (input.items.length !== 2 || uniqueSides.size !== 2 || !uniqueSides.has('FRONT') || !uniqueSides.has('BACK')) {
      throw new BadRequestException('KYC upload signatures must include exactly FRONT and BACK documents');
    }

    return input.items.map((item, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `kyc/${input.userId}`,
        requesterUserId: input.userId,
        assetType: 'IMAGE',
        sequence: index + 1,
      }),
    );
  }
}
