import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startedAt = new Date();

  @ApiOperation({ summary: 'Deployment smoke health check' })
  @ApiOkResponse({ description: 'API gateway is ready to receive traffic.' })
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'api-gateway',
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
