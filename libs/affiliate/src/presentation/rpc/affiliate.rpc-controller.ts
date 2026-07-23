import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AFFILIATE_MESSAGE_PATTERNS,
  } from '@contracts';
import type {
  AffiliateAccountsLookupMessage,
  ActiveAffiliateProgramsLookupMessage,
  AffiliateAccountSummaryMessage,
  AffiliateAccountConversionsLookupMessage,
  AffiliateAccountPayoutsLookupMessage,
  AffiliateCodesLookupMessage,
  AffiliateCommissionsLookupMessage,
  AffiliateConversionsLookupMessage,
  AffiliatePayoutsLookupMessage,
  AffiliateProgramsLookupMessage,
  AffiliateProgramMembersLookupMessage,
  ApproveAffiliateConversionMessage,
  CreateAffiliateCodeMessage,
  CreateAffiliatePayoutMessage,
  CreateAffiliateProgramMessage,
  JoinAffiliateProgramMessage,
  RejectAffiliateConversionMessage,
  UpdateAffiliatePayoutStatusMessage,
  ResolveAffiliateAttributionMessage,
  SellerAffiliateProgramsLookupMessage,
  SellerAffiliateSummaryMessage,
  UpdateAffiliateProgramMessage,
  AffiliateProgramCommissionsLookupMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  ApproveAffiliateConversionUseCase,
  CreateAffiliateCodeUseCase,
  CreateAffiliatePayoutUseCase,
  CreateAffiliateProgramUseCase,
  GetAffiliateAccountSummaryUseCase,
  JoinAffiliateProgramUseCase,
  ListAffiliateCommissionsByAccountUseCase,
  ListAffiliateConversionsByAccountUseCase,
  ListAffiliateConversionsByProgramUseCase,
  ListAffiliateCodesByAccountUseCase,
  ListAffiliatePayoutsByAccountUseCase,
  ListAffiliatePayoutsByProgramUseCase,
  ListMyAffiliateAccountsUseCase,
  ListMyAffiliateProgramsUseCase,
  RejectAffiliateConversionUseCase,
  UpdateAffiliatePayoutStatusUseCase,
  ResolveAffiliateAttributionUseCase,
  ListActiveAffiliateProgramsUseCase,
  ListAffiliateProgramMembersUseCase,
  ListSellerAffiliateProgramsUseCase,
  GetSellerAffiliateSummaryUseCase,
  UpdateAffiliateProgramUseCase,
  ListAffiliateProgramCommissionsUseCase,
} from '../../application/use-cases';

@Controller()
export class AffiliateRpcController {
  constructor(
    private readonly createAffiliateProgramUseCase: CreateAffiliateProgramUseCase,
    private readonly listMyAffiliateProgramsUseCase: ListMyAffiliateProgramsUseCase,
    private readonly joinAffiliateProgramUseCase: JoinAffiliateProgramUseCase,
    private readonly listMyAffiliateAccountsUseCase: ListMyAffiliateAccountsUseCase,
    private readonly getAffiliateAccountSummaryUseCase: GetAffiliateAccountSummaryUseCase,
    private readonly listAffiliateConversionsByAccountUseCase: ListAffiliateConversionsByAccountUseCase,
    private readonly createAffiliateCodeUseCase: CreateAffiliateCodeUseCase,
    private readonly listAffiliateCodesByAccountUseCase: ListAffiliateCodesByAccountUseCase,
    private readonly listAffiliateCommissionsByAccountUseCase: ListAffiliateCommissionsByAccountUseCase,
    private readonly listAffiliateConversionsByProgramUseCase: ListAffiliateConversionsByProgramUseCase,
    private readonly approveAffiliateConversionUseCase: ApproveAffiliateConversionUseCase,
    private readonly createAffiliatePayoutUseCase: CreateAffiliatePayoutUseCase,
    private readonly listAffiliatePayoutsByAccountUseCase: ListAffiliatePayoutsByAccountUseCase,
    private readonly listAffiliatePayoutsByProgramUseCase: ListAffiliatePayoutsByProgramUseCase,
    private readonly rejectAffiliateConversionUseCase: RejectAffiliateConversionUseCase,
    private readonly updateAffiliatePayoutStatusUseCase: UpdateAffiliatePayoutStatusUseCase,
    private readonly resolveAffiliateAttributionUseCase: ResolveAffiliateAttributionUseCase,
    private readonly listActiveAffiliateProgramsUseCase: ListActiveAffiliateProgramsUseCase,
    private readonly listAffiliateProgramMembersUseCase: ListAffiliateProgramMembersUseCase,
    private readonly listSellerAffiliateProgramsUseCase: ListSellerAffiliateProgramsUseCase,
    private readonly getSellerAffiliateSummaryUseCase: GetSellerAffiliateSummaryUseCase,
    private readonly updateAffiliateProgramUseCase: UpdateAffiliateProgramUseCase,
    private readonly listAffiliateProgramCommissionsUseCase: ListAffiliateProgramCommissionsUseCase,
  ) {}

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findSellerPrograms)
  async findSellerPrograms(@Payload() payload: SellerAffiliateProgramsLookupMessage) {
    try {
      return await this.listSellerAffiliateProgramsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.getSellerSummary)
  async getSellerSummary(@Payload() payload: SellerAffiliateSummaryMessage) {
    try {
      return await this.getSellerAffiliateSummaryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.updateProgram)
  async updateProgram(@Payload() payload: UpdateAffiliateProgramMessage) {
    try {
      return await this.updateAffiliateProgramUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findProgramCommissions)
  async findProgramCommissions(
    @Payload() payload: AffiliateProgramCommissionsLookupMessage,
  ) {
    try {
      return await this.listAffiliateProgramCommissionsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findActivePrograms)
  async findActivePrograms(@Payload() payload: ActiveAffiliateProgramsLookupMessage) {
    try {
      return await this.listActiveAffiliateProgramsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findProgramMembers)
  async findProgramMembers(@Payload() payload: AffiliateProgramMembersLookupMessage) {
    try {
      return await this.listAffiliateProgramMembersUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.resolveAttribution)
  async resolveAttribution(@Payload() payload: ResolveAffiliateAttributionMessage) {
    try {
      return await this.resolveAffiliateAttributionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.createProgram)
  async createProgram(@Payload() payload: CreateAffiliateProgramMessage) {
    try {
      return await this.createAffiliateProgramUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findMyPrograms)
  async findMyPrograms(@Payload() payload: AffiliateProgramsLookupMessage) {
    try {
      return await this.listMyAffiliateProgramsUseCase.execute(payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.joinProgram)
  async joinProgram(@Payload() payload: JoinAffiliateProgramMessage) {
    try {
      return await this.joinAffiliateProgramUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findMyAccounts)
  async findMyAccounts(@Payload() payload: AffiliateAccountsLookupMessage) {
    try {
      return await this.listMyAffiliateAccountsUseCase.execute(payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.getAccountSummary)
  async getAccountSummary(@Payload() payload: AffiliateAccountSummaryMessage) {
    try {
      return await this.getAffiliateAccountSummaryUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findConversionsByAccount)
  async findConversionsByAccount(@Payload() payload: AffiliateAccountConversionsLookupMessage) {
    try {
      return await this.listAffiliateConversionsByAccountUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.createCode)
  async createCode(@Payload() payload: CreateAffiliateCodeMessage) {
    try {
      return await this.createAffiliateCodeUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findCodesByAccount)
  async findCodesByAccount(@Payload() payload: AffiliateCodesLookupMessage) {
    try {
      return await this.listAffiliateCodesByAccountUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findCommissionsByAccount)
  async findCommissionsByAccount(@Payload() payload: AffiliateCommissionsLookupMessage) {
    try {
      return await this.listAffiliateCommissionsByAccountUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findPayoutsByAccount)
  async findPayoutsByAccount(@Payload() payload: AffiliateAccountPayoutsLookupMessage) {
    try {
      return await this.listAffiliatePayoutsByAccountUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findConversionsByProgram)
  async findConversionsByProgram(@Payload() payload: AffiliateConversionsLookupMessage) {
    try {
      return await this.listAffiliateConversionsByProgramUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.approveConversion)
  async approveConversion(@Payload() payload: ApproveAffiliateConversionMessage) {
    try {
      return await this.approveAffiliateConversionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.rejectConversion)
  async rejectConversion(@Payload() payload: RejectAffiliateConversionMessage) {
    try {
      return await this.rejectAffiliateConversionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.createPayout)
  async createPayout(@Payload() payload: CreateAffiliatePayoutMessage) {
    try {
      return await this.createAffiliatePayoutUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.findPayoutsByProgram)
  async findPayoutsByProgram(@Payload() payload: AffiliatePayoutsLookupMessage) {
    try {
      return await this.listAffiliatePayoutsByProgramUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AFFILIATE_MESSAGE_PATTERNS.updatePayoutStatus)
  async updatePayoutStatus(@Payload() payload: UpdateAffiliatePayoutStatusMessage) {
    try {
      return await this.updateAffiliatePayoutStatusUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
