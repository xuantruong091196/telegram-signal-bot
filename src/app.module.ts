import { AlertsModule } from './alerts/alerts.module';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { RouterModule, Routes } from 'nest-router';
import { validationSchema } from './config/schema';
import * as Joi from '@hapi/joi';
import app from './config/app.config';
import telegram from './config/telegram.config';
import { BingxService } from './bingx/bingx.service';

const routes: Routes = [
  {
    path: '/bot/v1/alerts',
    module: AlertsModule,
  },
];

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [app, telegram],
      validationOptions: {
        allowUnknowns: false,
      },
      validationSchema: Joi.object(validationSchema),
    }),
    RouterModule.forRoutes(routes),
    AlertsModule,
  ],
  controllers: [],
  providers: [BingxService],
})
export class AppModule {}
