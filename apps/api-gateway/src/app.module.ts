import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayAuthModule } from './modules/auth/auth.module';
import { GatewayUsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GatewayUsersModule,
    GatewayAuthModule,
  ],
})
export class AppModule {}
