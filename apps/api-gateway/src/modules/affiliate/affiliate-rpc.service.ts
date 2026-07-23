import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AFFILIATE_SERVICE_CLIENT,
  AFFILIATE_MESSAGE_PATTERNS,
  ActiveAffiliateProgramsLookupMessage,
  AffiliateAccountsLookupMessage,
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
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AffiliateRpcService {
  constructor(
    @Inject(AFFILIATE_SERVICE_CLIENT)
    private readonly affiliateClient: ClientProxy,
  ) {}

  createProgram(payload: CreateAffiliateProgramMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.createProgram, payload);
  }

  resolveAttribution(payload: ResolveAffiliateAttributionMessage) {
    return this.send<{ code: string; programId: string; expiresAt: Date }>(
      AFFILIATE_MESSAGE_PATTERNS.resolveAttribution,
      payload,
    );
  }

  findActivePrograms(payload: ActiveAffiliateProgramsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findActivePrograms, payload);
  }

  findProgramMembers(payload: AffiliateProgramMembersLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findProgramMembers, payload);
  }

  findMyPrograms(payload: AffiliateProgramsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findMyPrograms, payload);
  }

  joinProgram(payload: JoinAffiliateProgramMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.joinProgram, payload);
  }

  findMyAccounts(payload: AffiliateAccountsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findMyAccounts, payload);
  }

  getAccountSummary(payload: AffiliateAccountSummaryMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.getAccountSummary, payload);
  }

  findConversionsByAccount(payload: AffiliateAccountConversionsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findConversionsByAccount, payload);
  }

  createCode(payload: CreateAffiliateCodeMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.createCode, payload);
  }

  findCodesByAccount(payload: AffiliateCodesLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findCodesByAccount, payload);
  }

  findCommissionsByAccount(payload: AffiliateCommissionsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findCommissionsByAccount, payload);
  }

  findPayoutsByAccount(payload: AffiliateAccountPayoutsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findPayoutsByAccount, payload);
  }

  findConversionsByProgram(payload: AffiliateConversionsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findConversionsByProgram, payload);
  }

  approveConversion(payload: ApproveAffiliateConversionMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.approveConversion, payload);
  }

  rejectConversion(payload: RejectAffiliateConversionMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.rejectConversion, payload);
  }

  createPayout(payload: CreateAffiliatePayoutMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.createPayout, payload);
  }

  findPayoutsByProgram(payload: AffiliatePayoutsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findPayoutsByProgram, payload);
  }

  updatePayoutStatus(payload: UpdateAffiliatePayoutStatusMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.updatePayoutStatus, payload);
  }

  findSellerPrograms(payload: SellerAffiliateProgramsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findSellerPrograms, payload);
  }

  getSellerSummary(payload: SellerAffiliateSummaryMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.getSellerSummary, payload);
  }

  updateProgram(payload: UpdateAffiliateProgramMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.updateProgram, payload);
  }

  findProgramCommissions(payload: AffiliateProgramCommissionsLookupMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.findProgramCommissions, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.affiliateClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
