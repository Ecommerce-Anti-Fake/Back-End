import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AFFILIATE_MESSAGE_PATTERNS,
  AffiliateAccountsLookupMessage,
  AffiliateAccountSummaryMessage,
  AffiliateAccountConversionsLookupMessage,
  AffiliateAccountPayoutsLookupMessage,
  AffiliateCodesLookupMessage,
  AffiliateCommissionsLookupMessage,
  AffiliateConversionsLookupMessage,
  AffiliatePayoutsLookupMessage,
  AffiliateProgramsLookupMessage,
  ApproveAffiliateConversionMessage,
  CreateAffiliateCodeMessage,
  CreateAffiliatePayoutMessage,
  CreateAffiliateProgramMessage,
  JoinAffiliateProgramMessage,
  RejectAffiliateConversionMessage,
  UpdateAffiliatePayoutStatusMessage,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AffiliateRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  createProgram(payload: CreateAffiliateProgramMessage) {
    return this.send(AFFILIATE_MESSAGE_PATTERNS.createProgram, payload);
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

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
