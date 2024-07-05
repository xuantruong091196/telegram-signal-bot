import { registerAs } from '@nestjs/config';

import { LEVERAGE } from './constant';
const ccxt = require('ccxt');
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
}));
const API_KEY = process.env.BING_X_API_KEY;
const API_SECRET = process.env.BING_X_SECRET_KEY;

export const bingx = new ccxt.bingx({
  apiKey: API_KEY,
  secret: API_SECRET,
});

const POSTITION_TYPE = {
  BUY: 'LONG',
  SELL: 'SHORT',
};
function calculateTPSLWithLeverage(price, leverage) {
  if (typeof price !== 'number' || price <= 0) {
    throw new Error('Invalid price value');
  }
  if (typeof leverage !== 'number' || leverage <= 0) {
    throw new Error('Invalid leverage value');
  }

  const TP = price * 1.6;
  const SL = price * 0.7;
  const leveragedTP = (TP - price) * leverage + price;
  const leveragedSL = (SL - price) * leverage + price;

  return {
    TP: leveragedTP.toFixed(2),
    SL: leveragedSL.toFixed(2),
  };
}

export function generateParams(str) {
  const [symbol, side, price] = str.split(' ');
  const modifiedSymbol = symbol.replace(
    /(\w+)(USDT|BTC|ETH|BNB|USD|EUR)/,
    '$1-$2',
  );
  const { TP, SL } = calculateTPSLWithLeverage(price, LEVERAGE);
  const result = {
    symbol: modifiedSymbol,
    side: side,
    price: parseFloat(price),
    positionSide: POSTITION_TYPE[side],
    takeProfit: `{"type": "TAKE_PROFIT_MARKET", "stopPrice": ${TP},"price": ${price},"workingType":"TRIGGER_MARKET"}`,
    stopLoss: `{"type": "STOP_MARKET", "stopPrice": ${SL},"price": ${price},"workingType":"TRIGGER_MARKET"}`,
  };
  return result;
}
