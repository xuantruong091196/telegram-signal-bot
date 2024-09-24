import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from 'nestjs-telegram';
import { catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { TelegramMessage } from 'nestjs-telegram/dist/interfaces/telegramTypes.interface';
// import { BingxService } from '../bingx/bingx.service';
// import { generateParams } from 'src/config/constant';
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  process(message: string): Observable<TelegramMessage> {
    return this.telegramService
      .sendMessage({
        chat_id: this.configService.get<string>('telegram.chatId'),
        text: message,
        parse_mode: 'html',
      })
      .pipe(
        map((res: any) => {
          this.logger.verbose(
            `Successfully sent message with id ${res.message_id}! `,
          );
          return res;
        }),
        catchError((err: any) => {
          if (
            err.response?.statusCode === 429 ||
            err.response?.statusCode === 400
          ) {
            this.logger.warn('Rate limit exceeded. Retrying after delay...');
            return new Observable((observer) => {
              setTimeout(() => {
                this.process(message).subscribe(observer);
              }, 20000);
            });
          }
          return this.processError(err);
        }),
      );
  }
  smcAlerts(message: string): Observable<TelegramMessage> {
    return this.telegramService
      .sendMessage({
        chat_id: this.configService.get<string>('telegram.chatId'),
        text: message,
        parse_mode: 'html',
      })
      .pipe(
        map((res: any) => {
          this.logger.verbose(
            `Successfully sent message with id ${res.message_id}! `,
          );
          return res;
        }),
        catchError((err: any) => {
          if (
            err.response?.statusCode === 429 ||
            err.response?.statusCode === 400
          ) {
            this.logger.warn('Rate limit exceeded. Retrying after delay...');
            return new Observable((observer) => {
              setTimeout(() => {
                this.smcAlerts(message).subscribe(observer);
              }, 20000);
            });
          }
          return this.processError(err);
        }),
      );
  }
  private processError(err: any): Observable<never> {
    if (err.response) {
      this.logger.error(
        `ERROR: ${err.response?.message} (status: ${err.response?.statusCode}) - Please check your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables and your network connection.`,
      );
      return throwError(
        new HttpException(err.response?.message, err.response?.statusCode),
      );
    } else if (err.request) {
      this.logger.error(`${err.message} - ${err.config.url}`);
      return throwError(
        new ServiceUnavailableException(`${err.message} - ${err.config.url}`),
      );
    } else {
      this.logger.error(`${err.message}`);
      return throwError(new InternalServerErrorException(err.message));
    }
  }
}
