import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import { RSI } from 'technicalindicators';
import * as dayjs from 'dayjs';
@Injectable()
export class DivergenceService {
  private readonly exchange;

  constructor() {
    this.exchange = new ccxt.binance({
      apiKey:
        process.env.BINANCE_API_KEY ||
        'c8m2NnLqCkHpykHJs9nr1lppWROD5IZcjko5S2Z0QpP1EzJCPA4bqNFQFhwfdtqy',
      secret:
        process.env.BINANCE_SECRET_KEY ||
        'Our8Q0Jzug4M4LXDQTuHuFr7QLGgY8AtQw1Ax8X5EDyHPDoPDu0sXeYTQacV2fFQ',
      enableRateLimit: true,
    });
  }
  async getOHLCV(symbol: string, timeframe: string, limit: number) {
    const ohlcv = await this.exchange.fetchOHLCV(
      symbol,
      timeframe,
      undefined,
      limit,
    );
    return ohlcv.map((item) => {
      return {
        timestamp: dayjs(item[0]).format('YYYY-MM-DD HH:mm:ss'),
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5],
      };
    });
  }

  // Tính toán RSI
  calculateRSI(closes: number[]): number[] {
    return RSI.calculate({ values: closes, period: 14 });
  }

  // Lọc các điểm HH và LL
  filterExtremes(data: any[], column: string, threshold: number): any[] {
    const filtered = [];
    let group = [];

    for (const item of data) {
      if (!group.length) {
        group.push(item);
      } else {
        const last = group[group.length - 1];
        if (Math.abs(item[column] - last[column]) / last[column] <= threshold) {
          group.push(item);
        } else {
          // Thêm giá trị cao nhất hoặc thấp nhất trong nhóm
          if (column === 'high') {
            filtered.push(
              group.reduce(
                (max, curr) => (curr.high > max.high ? curr : max),
                group[0],
              ),
            );
          } else if (column === 'low') {
            filtered.push(
              group.reduce(
                (min, curr) => (curr.low < min.low ? curr : min),
                group[0],
              ),
            );
          }
          group = [item];
        }
      }
    }

    // Thêm nhóm cuối cùng
    if (group.length) {
      if (column === 'high') {
        filtered.push(
          group.reduce(
            (max, curr) => (curr.high > max.high ? curr : max),
            group[0],
          ),
        );
      } else if (column === 'low') {
        filtered.push(
          group.reduce(
            (min, curr) => (curr.low < min.low ? curr : min),
            group[0],
          ),
        );
      }
    }

    return filtered;
  }

  // Kiểm tra phân kỳ gần nhất
  async checkLatestDivergence(
    symbol: string,
    timeframe: string,
    checkPeriod: number,
  ) {
    const df = await this.getOHLCV(symbol, timeframe, 500);
    const closes = df.map((row) => row.close);
    const highs = df.map((row) => row.high);
    const lows = df.map((row) => row.low);

    // Tính RSI
    const rsiValues = this.calculateRSI(closes);

    // Thêm dữ liệu RSI vào dataframe
    df.forEach((row, index) => {
      row.rsi = rsiValues[index];
    });

    // Lọc các điểm HH và LL
    const filteredHH = this.filterExtremes(
      df.filter((row) => row.high),
      'high',
      0.02,
    );
    const filteredLL = this.filterExtremes(
      df.filter((row) => row.low),
      'low',
      0.02,
    );

    // Kiểm tra phân kỳ
    const peakDivergence = this.detectPeakDivergence(filteredHH);
    const troughDivergence = this.detectTroughDivergence(filteredLL);

    return { peakDivergence, troughDivergence };
  }

  // Kiểm tra phân kỳ đỉnh
  detectPeakDivergence(peaks: any[]): string | null {
    for (let i = 1; i < peaks.length; i++) {
      const currentPeak = peaks[i];
      const previousPeak = peaks[i - 1];
      if (
        currentPeak.rsi < previousPeak.rsi &&
        currentPeak.high > previousPeak.high
      ) {
        return 'Phân kỳ đỉnh';
      }
    }
    return null;
  }

  detectTroughDivergence(troughs: any[]): string | null {
    for (let i = 1; i < troughs.length; i++) {
      const currentTrough = troughs[i];
      const previousTrough = troughs[i - 1];
      if (
        currentTrough.rsi > previousTrough.rsi &&
        currentTrough.low < previousTrough.low
      ) {
        return 'Phân kỳ đáy';
      }
    }
    return null;
  }

  async analyzeDivergences(symbols: string[], timeframes: string[]) {
    const results: string[] = [];

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const result = await this.checkLatestDivergence(symbol, timeframe, 1.5);

        if (result.peakDivergence) {
          const peakMessage = `${symbol} - ${timeframe} - ${result.peakDivergence}`;
          results.push(peakMessage);
        }

        if (result.troughDivergence) {
          const troughMessage = `${symbol} - ${timeframe} - ${result.troughDivergence}`;
          results.push(troughMessage);
        }
      }
    }
    return results;
  }
}
