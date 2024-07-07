import { Injectable, Logger } from '@nestjs/common';
import { bingx } from 'src/config/constant';
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
    // await bingx.setLeverage(LEVERAGE, params.symbol, params);
    // await bingx.createOrder(
    //   params.symbol,
    //   'limit',
    //   params.positionSide.toUppercase(),
    //   5,
    //   params.price,
    //   params,
    // );
    Logger.log(params)
  }
}
