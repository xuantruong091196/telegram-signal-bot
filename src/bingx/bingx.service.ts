import { Injectable } from '@nestjs/common';
import { bingx } from 'src/config/app.config';
import { LEVERAGE } from 'src/config/constant';

@Injectable()
export class BingxService {
  async createOrder(params: {
    symbol: any;
    side: string;
    price: number;
    positionSide: any;
    takeProfit: string;
    stopLoss: string;
  }) {
    await bingx.setMarginMode('isolated', params.symbol, params);
    await bingx.setLeverage(LEVERAGE, params.symbol, params);
    await bingx.createOrder(
      params.symbol,
      'limit',
      params.side.toLowerCase(),
      5,
      params.price,
      params,
    );
  }
}
