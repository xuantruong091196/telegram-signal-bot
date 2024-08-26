import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DivergenceService } from '../divergence/divergence.service';
import { AlertsService } from 'src/alerts/alerts.service';

@Injectable()
export class ScheduledTaskService implements OnModuleInit {
  private readonly symbols = [
    'BTC/USDT',
    'ETH/USDT',
    'BCH/USDT',
    'XRP/USDT',
    'EOS/USDT',
    'LTC/USDT',
    'TRX/USDT',
    'ETC/USDT',
    'LINK/USDT',
    'XLM/USDT',
    'ADA/USDT',
    'XMR/USDT',
    'DASH/USDT',
    'ZEC/USDT',
    'XTZ/USDT',
    'BNB/USDT',
    'ATOM/USDT',
    'ONT/USDT',
    'IOTA/USDT',
    'BAT/USDT',
    'VET/USDT',
    'NEO/USDT',
    'QTUM/USDT',
    'IOST/USDT',
    'THETA/USDT',
    'ALGO/USDT',
    'ZIL/USDT',
    'KNC/USDT',
    'ZRX/USDT',
    'COMP/USDT',
    'OMG/USDT',
    'DOGE/USDT',
    'SXP/USDT',
    'KAVA/USDT',
    'BAND/USDT',
    'RLC/USDT',
    'WAVES/USDT',
    'MKR/USDT',
    'SNX/USDT',
    'DOT/USDT',
    'DEFI/USDT',
    'YFI/USDT',
    'BAL/USDT',
    'CRV/USDT',
    'TRB/USDT',
    'RUNE/USDT',
    'SUSHI/USDT',
    'EGLD/USDT',
    'SOL/USDT',
    'ICX/USDT',
    'STORJ/USDT',
    'BLZ/USDT',
    'UNI/USDT',
    'AVAX/USDT',
    'FTM/USDT',
    'ENJ/USDT',
    'FLM/USDT',
    'REN/USDT',
    'KSM/USDT',
    'NEAR/USDT',
    'AAVE/USDT',
    'FIL/USDT',
    'RSR/USDT',
    'LRC/USDT',
    'MATIC/USDT',
    'OCEAN/USDT',
    'CVC/USDT',
    'BEL/USDT',
    'CTK/USDT',
    'AXS/USDT',
    'ALPHA/USDT',
    'ZEN/USDT',
    'SKL/USDT',
    'GRT/USDT',
    '1INCH/USDT',
    'CHZ/USDT',
    'SAND/USDT',
    'ANKR/USDT',
    'LIT/USDT',
    'UNFI/USDT',
    'REEF/USDT',
    'RVN/USDT',
    'SFP/USDT',
    'XEM/USDT',
    'BTCST/USDT',
    'COTI/USDT',
    'CHR/USDT',
    'MANA/USDT',
    'ALICE/USDT',
    'HBAR/USDT',
    'ONE/USDT',
    'LINA/USDT',
    'STMX/USDT',
    'DENT/USDT',
    'CELR/USDT',
    'HOT/USDT',
    'MTL/USDT',
    'OGN/USDT',
    'NKN/USDT',
    'SC/USDT',
    'DGB/USDT',
    '1000SHIB/USDT',
    'BAKE/USDT',
    'GTC/USDT',
    'BTCDOM/USDT',
    'IOTX/USDT',
    'RAY/USDT',
    'C98/USDT',
    'MASK/USDT',
    'ATA/USDT',
    'DYDX/USDT',
    'GALA/USDT',
    'CELO/USDT',
    'ARPA/USDT',
    'CTSI/USDT',
    'LPT/USDT',
    'ENS/USDT',
    'PEOPLE/USDT',
    'ANT/USDT',
    'ROSE/USDT',
    'DUSK/USDT',
    'FLOW/USDT',
    'IMX/USDT',
    'API3/USDT',
    'AUDIO/USDT',
    'GMT/USDT',
    'APE/USDT',
    'JASMY/USDT',
    'ACH/USDT',
    'WOO/USDT',
    'VGX/USDT',
    'STG/USDT',
    'LDO/USDT',
    'OP/USDT',
    'MAGIC/USDT',
    'GMX/USDT',
    'HFT/USDT',
    'HOOK/USDT',
    'FLOKI/USDT',
    'ASTR/USDT',
    'ID/USDT',
    'JOE/USDT',
    'LOKA/USDT',
    'TUSD/USDT',
  ];
  private readonly timeframes = ['1h', '4h'];

  constructor(
    private readonly divergenceService: DivergenceService,
    private readonly alertService: AlertsService,
  ) {}
  async onModuleInit() {
    await this.runTask();
  }
  @Cron(CronExpression.EVERY_2_HOURS)
  async handleCron() {
    console.log('Running scheduled task for divergence analysis');

    await this.runTask();
  }
  private chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }
  private async runTask() {
    const results = await this.divergenceService.analyzeDivergence(
      this.symbols,
      this.timeframes,
    );
    if (results && results.length > 0) {
      const chunkSize = Math.ceil(results.length / 5); // Chia thành 5 nhóm
      const chunks = this.chunkArray(results, chunkSize);

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map((result) => this.alertService.process(result).toPromise()),
        );
      }
    } else {
      console.log('No divergences found.');
    }
  }
}
