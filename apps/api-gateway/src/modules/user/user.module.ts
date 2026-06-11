import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUsersModule } from '../users/users.module';
import { UserController } from './user.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUsersModule],
  controllers: [UserController],
})
export class GatewayUserModule {}
