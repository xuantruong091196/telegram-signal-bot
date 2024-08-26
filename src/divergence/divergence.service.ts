import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';
import * as moment from 'moment';
import { RSI } from 'technicalindicators';

@Injectable()
export class DivergenceService {
  private readonly exchange;

  constructor() {
    this.exchange = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY || '',
      secret: process.env.BINANCE_SECRET_KEY || '',
      enableRateLimit: true,
    });
  }

  // Hàm lấy dữ liệu OHLCV
  async getOhlcv(symbol: string, timeframe: string, limit = 500) {
    const now = moment();
    let since;

    if (timeframe === '15m') {
      since = now.subtract(2, 'days');
    } else if (timeframe === '1h') {
      since = now.subtract(8, 'days');
    } else if (timeframe === '4h') {
      since = now.subtract(24, 'days');
    } else {
      since = now.subtract(1, 'days');
    }

    const sinceMs = since.valueOf();
    const ohlcv = await this.exchange.fetchOHLCV(
      symbol,
      timeframe,
      sinceMs,
      limit,
    );

    return ohlcv.map((candle) => ({
      timestamp: new Date(candle[0]),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
  }

  // Hàm lọc HH cao nhất và LL thấp nhất trong các nhóm gần nhau
  filterExtremes(data, column: string, threshold: number) {
    const filtered = [];
    let group = [];

    for (let i = 0; i < data.length; i++) {
      if (group.length === 0) {
        group.push(data[i]);
      } else {
        const diff =
          Math.abs(data[i][column] - group[group.length - 1][column]) /
          group[group.length - 1][column];
        if (diff <= threshold) {
          group.push(data[i]);
        } else {
          if (column === 'high') {
            filtered.push(group.reduce((a, b) => (a.high > b.high ? a : b)));
          } else if (column === 'low') {
            filtered.push(group.reduce((a, b) => (a.low < b.low ? a : b)));
          }
          group = [data[i]];
        }
      }
    }

    if (group.length > 0) {
      if (column === 'high') {
        filtered.push(group.reduce((a, b) => (a.high > b.high ? a : b)));
      } else if (column === 'low') {
        filtered.push(group.reduce((a, b) => (a.low < b.low ? a : b)));
      }
    }

    return filtered;
  }

  // Hàm kiểm tra phân kỳ giữa các đỉnh và đáy gần nhất
  checkLatestDivergence(data, symbol: string, timeframe: string) {
    const rsi = RSI.calculate({ values: data.map((d) => d.close), period: 14 });

    const hh = data.filter(
      (d, i) =>
        d.high > (data[i - 6]?.high || 0) && d.high > (data[i + 6]?.high || 0),
    );
    const ll = data.filter(
      (d, i) =>
        d.low < (data[i - 6]?.low || 0) && d.low < (data[i + 6]?.low || 0),
    );

    const peakMinDistances = { '15m': 0.01, '1h': 0.02, '4h': 0.04 };
    const troughMinDistances = { '15m': 0.01, '1h': 0.02, '4h': 0.04 };

    const filteredHh = this.filterExtremes(
      hh,
      'high',
      peakMinDistances[timeframe],
    );
    const filteredLl = this.filterExtremes(
      ll,
      'low',
      troughMinDistances[timeframe],
    );

    const validPeaks = filteredHh.slice(-3);
    const validTroughs = filteredLl.slice(-3);

    let latestDivergence = null;

    for (let i = 0; i < validPeaks.length; i++) {
      for (let j = i + 1; j < validPeaks.length; j++) {
        const rsiDiff = Math.abs(rsi[i] - rsi[j]);
        if (
          rsiDiff >= 5 &&
          rsi[i] < rsi[j] &&
          validPeaks[i].high > validPeaks[j].high
        ) {
          latestDivergence = `${symbol} - Phân kỳ đỉnh - ${timeframe}`;
          break;
        }
      }
      if (latestDivergence) break;
    }

    if (!latestDivergence) {
      for (let i = 0; i < validTroughs.length; i++) {
        for (let j = i + 1; j < validTroughs.length; j++) {
          const rsiDiff = Math.abs(rsi[i] - rsi[j]);
          if (
            rsiDiff >= 5 &&
            rsi[i] > rsi[j] &&
            validTroughs[i].low < validTroughs[j].low
          ) {
            latestDivergence = `${symbol} - Phân kỳ đáy - ${timeframe}`;
            break;
          }
        }
        if (latestDivergence) break;
      }
    }

    return latestDivergence;
  }

  // Hàm chính để phân tích phân kỳ gần nhất
  async analyzeDivergence(symbols: string[], timeframes: string[]) {
    const results = [];

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const data = await this.getOhlcv(symbol, timeframe);
        const divergence = this.checkLatestDivergence(data, symbol, timeframe);
        if (divergence) {
          results.push(divergence);
        }
      }
    }

    results.sort((a, b) => {
      const [, aType, aTimeframe] = a.split(' - ');
      const [, bType, bTimeframe] = b.split(' - ');
      return aType.localeCompare(bType) || aTimeframe.localeCompare(bTimeframe);
    });
    return results;
  }
}
