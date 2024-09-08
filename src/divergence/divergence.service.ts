/* eslint-disable prefer-const */
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

  calculateRSI(data, period = 14) {
    const closePrices = data.map((candle) => candle.close);
    const rsi = RSI.calculate({ values: closePrices, period: period });
    // Gắn RSI vào mỗi cây nến
    data.forEach((candle, index) => {
      candle.rsi = rsi[index - period + 1] || null; // Gán null nếu không có đủ dữ liệu cho RSI
    });
    return data;
  }
  filterExtremes(data, column, threshold) {
    let filtered = [];
    let group = [];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      if (group.length === 0) {
        group.push(current);
      } else {
        const last = group[group.length - 1];
        const diff = Math.abs((current[column] - last[column]) / last[column]);
        if (diff <= threshold) {
          group.push(current);
        } else {
          // Thêm giá trị cao nhất/thấp nhất trong nhóm
          if (column === 'high') {
            filtered.push(
              group.reduce((max, item) => (item.high > max.high ? item : max)),
            );
          } else if (column === 'low') {
            filtered.push(
              group.reduce((min, item) => (item.low < min.low ? item : min)),
            );
          }
          group = [current];
        }
      }
    }

    // Thêm nhóm cuối cùng
    if (group.length > 0) {
      if (column === 'high') {
        filtered.push(
          group.reduce((max, item) => (item.high > max.high ? item : max)),
        );
      } else if (column === 'low') {
        filtered.push(
          group.reduce((min, item) => (item.low < min.low ? item : min)),
        );
      }
    }

    return filtered;
  }
  // Hàm kiểm tra phân kỳ gần nhất
  checkLatestDivergence(data, symbol, timeframe, checkPeriod) {
    const peakMinDistances = {
      '15m': 0.01,
      '30m': 0.015,
      '1h': 0.02,
      '4h': 0.05,
    };

    const troughMinDistances = {
      '15m': 0.01,
      '30m': 0.015,
      '1h': 0.02,
      '4h': 0.05,
    };

    // Lọc các điểm cao nhất (HH) và thấp nhất (LL)
    const hh = this.filterExtremes(data, 'high', peakMinDistances[timeframe]);
    const ll = this.filterExtremes(data, 'low', troughMinDistances[timeframe]);

    // Lọc theo điều kiện RSI
    const validPeaks = hh.filter((candle) => candle.rsi > 50).slice(-3); // Tối đa 3 đỉnh gần nhất
    const validTroughs = ll.filter((candle) => candle.rsi < 50).slice(-3); // Tối đa 3 đáy gần nhất

    // Kiểm tra phân kỳ
    let latestPeakDivergence = null;
    let latestTroughDivergence = null;

    if (validPeaks.length >= 2) {
      for (let i = 1; i < validPeaks.length; i++) {
        const rsiDiff = Math.abs(validPeaks[i].rsi - validPeaks[i - 1].rsi);
        if (
          rsiDiff >= 5 &&
          validPeaks[i].rsi < validPeaks[i - 1].rsi &&
          validPeaks[i].high > validPeaks[i - 1].high
        ) {
          latestPeakDivergence = `${symbol} - Phân kỳ đỉnh - ${timeframe}`;
          break;
        }
      }
    }

    if (validTroughs.length >= 2) {
      for (let i = 1; i < validTroughs.length; i++) {
        const rsiDiff = Math.abs(validTroughs[i].rsi - validTroughs[i - 1].rsi);
        if (
          rsiDiff >= 5 &&
          validTroughs[i].rsi > validTroughs[i - 1].rsi &&
          validTroughs[i].low < validTroughs[i - 1].low
        ) {
          latestTroughDivergence = `${symbol} - Phân kỳ đáy - ${timeframe}`;
          break;
        }
      }
    }

    return { latestPeakDivergence, latestTroughDivergence };
  }

  async analyze(symbols, intervals) {
    const results = [];

    for (const symbol of symbols) {
      for (const [interval, period] of Object.entries(intervals)) {
        const data = await this.getOHLCV(symbol, interval, 2000);
        const dataWithRsi = this.calculateRSI(data);
        const {
          latestPeakDivergence,
          latestTroughDivergence,
        } = this.checkLatestDivergence(
          dataWithRsi,
          symbol,
          interval,
          intervals,
        );

        if (latestTroughDivergence) {
          results.push({
            interval,
            type: 'Trough',
            message: latestTroughDivergence,
          });
        } else if (latestPeakDivergence) {
          results.push({
            interval,
            type: 'Peak',
            message: latestPeakDivergence,
          });
        }
      }
    }

    // Sắp xếp kết quả
    results.sort((a, b) => {
      const timeframes = { '15m': 0, '30m': 1, '1h': 2, '4h': 3 };
      return a.type === b.type
        ? timeframes[a.interval] - timeframes[b.interval]
        : a.type === 'Peak'
        ? -1
        : 1;
    });
    return results;
  }
}
