import { Controller, MessageEvent, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload } from '@contracts';
import { interval, merge, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardInvalidationScope, DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';

@ApiTags('Dashboard')
@Controller('user')
export class DashboardController {
  constructor(
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiOperation({ summary: 'SSE invalidation stream cho dashboard counters va queues' })
  @Sse('dashboard/events')
  dashboardEvents(
    @Query('accessToken') accessToken?: string,
    @Query('shopId') shopId?: string,
  ): Observable<MessageEvent> {
    const payload = this.verifySseAccessToken(accessToken);
    const scopes: DashboardInvalidationScope[] = [`user:${payload.sub}`];
    if (payload.role === 'admin') {
      scopes.push('role:admin');
    }
    if (shopId?.trim()) {
      scopes.push(`shop:${shopId.trim()}`);
    }

    return merge(
      of({
        type: 'dashboard.connected',
        data: { family: 'dashboard', scopes },
      }),
      interval(25000).pipe(
        map(() => ({
          type: 'dashboard.heartbeat',
          data: { family: 'dashboard', ts: new Date().toISOString() },
        })),
      ),
      this.dashboardSseBrokerService.streamForScopes(scopes),
    );
  }

  private verifySseAccessToken(accessToken?: string) {
    if (!accessToken) {
      throw new UnauthorizedException('Missing access token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (!payload.sub || !payload.role || payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    return payload;
  }
}
