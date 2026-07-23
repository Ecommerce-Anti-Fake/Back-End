import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateProgramResponse } from './affiliate.mapper';

type ProgramStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
type ProgramScope = 'SHOP' | 'OFFER';

type UpdateAffiliateProgramInput = {
  requesterUserId: string;
  programId: string;
  name?: string;
  scopeType?: ProgramScope;
  offerId?: string | null;
  attributionWindowDays?: number;
  tier1Rate?: number;
  tier2Rate?: number;
  startedAt?: string | null;
  endedAt?: string | null;
  programStatus?: ProgramStatus;
};

@Injectable()
export class UpdateAffiliateProgramUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: UpdateAffiliateProgramInput) {
    const program = await this.repository.findOwnedProgramForUpdate(
      input.programId,
      input.requesterUserId,
    );
    if (!program) {
      throw new NotFoundException('Affiliate program not found');
    }
    if (program.programStatus === 'CLOSED') {
      throw new BadRequestException('Closed affiliate programs cannot be changed');
    }

    const configurationLocked =
      program._count.accounts > 0 || program._count.conversions > 0;
    if (configurationLocked && this.hasCommercialConfiguration(input)) {
      throw new BadRequestException(
        'Affiliate scope, rates, and attribution window are locked after the first member or conversion',
      );
    }

    const nextStatus = input.programStatus ?? program.programStatus;
    this.validateStatusTransition(program.programStatus, nextStatus);

    const name = input.name === undefined ? undefined : input.name.trim();
    if (name !== undefined && !name) {
      throw new BadRequestException('Program name is required');
    }

    const tier1Rate =
      input.tier1Rate ?? Number(program.tier1Rate.toString());
    const tier2Rate =
      input.tier2Rate ?? Number(program.tier2Rate.toString());
    if (tier1Rate <= 0 || tier2Rate < 0 || tier2Rate > tier1Rate) {
      throw new BadRequestException(
        'Tier 1 must be positive and tier 2 cannot exceed tier 1',
      );
    }
    if (tier1Rate + tier2Rate > 100) {
      throw new BadRequestException(
        'Combined affiliate rates cannot exceed 100 percent',
      );
    }

    let offerId =
      input.offerId === undefined ? program.offerId : input.offerId;
    if (input.scopeType !== undefined || input.offerId !== undefined) {
      const requestedScope = input.scopeType ?? program.scopeType;
      if (requestedScope !== 'SHOP' && requestedScope !== 'OFFER') {
        throw new BadRequestException(
          'Legacy affiliate scope must be changed to SHOP or OFFER before selecting a target',
        );
      }
      if (requestedScope === 'SHOP') {
        offerId = null;
      } else if (!offerId) {
        throw new BadRequestException(
          'offerId is required for OFFER affiliate scope',
        );
      } else {
        const offer = await this.repository.findOwnedOffer(
          offerId,
          input.requesterUserId,
        );
        if (!offer || offer.shopId !== program.ownerShopId) {
          throw new BadRequestException(
            'Offer is invalid for the affiliate program shop',
          );
        }
      }
    }

    const startedAt = this.datePatchValue(
      input,
      'startedAt',
      program.startedAt,
    );
    const endedAt = this.datePatchValue(input, 'endedAt', program.endedAt);
    if (startedAt && endedAt && startedAt > endedAt) {
      throw new BadRequestException('startedAt must be earlier than endedAt');
    }

    const updated = await this.repository.updateProgram(input.programId, {
      ...(name !== undefined ? { name } : {}),
      ...(input.scopeType !== undefined ? { scopeType: input.scopeType } : {}),
      ...(input.scopeType !== undefined || input.offerId !== undefined
        ? { offerId }
        : {}),
      ...(input.attributionWindowDays !== undefined
        ? { attributionWindowDays: input.attributionWindowDays }
        : {}),
      ...(input.tier1Rate !== undefined ? { tier1Rate } : {}),
      ...(input.tier2Rate !== undefined ? { tier2Rate } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, 'startedAt')
        ? { startedAt }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(input, 'endedAt')
        ? { endedAt }
        : {}),
      ...(input.programStatus !== undefined
        ? { programStatus: nextStatus }
        : {}),
    });

    return {
      ...toAffiliateProgramResponse(updated),
      memberCount: updated._count.accounts,
      conversionCount: updated._count.conversions,
      configurationLocked:
        updated._count.accounts > 0 || updated._count.conversions > 0,
    };
  }

  private hasCommercialConfiguration(input: UpdateAffiliateProgramInput) {
    return (
      input.scopeType !== undefined ||
      input.offerId !== undefined ||
      input.attributionWindowDays !== undefined ||
      input.tier1Rate !== undefined ||
      input.tier2Rate !== undefined
    );
  }

  private validateStatusTransition(current: ProgramStatus, next: ProgramStatus) {
    if (current === next) return;
    const allowed: Record<ProgramStatus, ProgramStatus[]> = {
      DRAFT: ['ACTIVE', 'CLOSED'],
      ACTIVE: ['PAUSED', 'CLOSED'],
      PAUSED: ['ACTIVE', 'CLOSED'],
      CLOSED: [],
    };
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Affiliate program cannot move from ${current} to ${next}`,
      );
    }
  }

  private datePatchValue(
    input: UpdateAffiliateProgramInput,
    field: 'startedAt' | 'endedAt',
    current: Date | null,
  ) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) return current;
    const value = input[field];
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field} datetime`);
    }
    return date;
  }
}
