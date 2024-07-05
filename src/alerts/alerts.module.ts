import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramModule } from 'nestjs-telegram';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { BingxService } from 'src/bingx/bingx.service';

@Module({
  imports: [
    TelegramModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          botKey: configService.get<string>('telegram.botToken'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, BingxService],
})
export class AlertsModule {}
