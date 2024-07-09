/* eslint-disable @typescript-eslint/no-var-requires */

const ccxt = require('ccxt');

export const LEVERAGE = 10;
export const API_KEY = process.env.BING_X_API_KEY;
export const API_SECRET = process.env.BING_X_SECRET_KEY;

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
  const TP = price + (60 * price) / 100 / leverage;
  const SL = price - (30 * price) / 100 / leverage;

  return {
    TP: TP.toFixed(2),
    SL: SL.toFixed(2),
  };
}

export function generateParams(str) {
  const [symbol, side, price] = str.split(' ');
  const modifiedSymbol = symbol.replace(/(\w+)(USDT)/, '$1-$2');
  const { TP, SL } = calculateTPSLWithLeverage(Number(price), LEVERAGE);
  console.log(modifiedSymbol);
  const result = {
    symbol: modifiedSymbol,
    side: POSTITION_TYPE[side],
    price: parseFloat(price),
    positionSide: POSTITION_TYPE[side],
    takeProfit: {
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: TP,
      price: price,
      workingType: 'TRIGGER_MARKET',
    },
    stopLoss: {
      type: 'STOP_MARKET',
      stopPrice: SL,
      price: price,
      workingType: 'TRIGGER_MARKET',
    },
    type: 'limit',
  };
  return result;
}

export function getParameters(payload, timestamp, urlEncode = false) {
  let parameters = '';
  for (const key in payload) {
    if (urlEncode) {
      parameters += key + '=' + encodeURIComponent(payload[key]) + '&';
    } else {
      parameters += key + '=' + payload[key] + '&';
    }
  }
  if (parameters) {
    parameters = parameters.substring(0, parameters.length - 1);
    parameters = parameters + '&timestamp=' + timestamp;
  } else {
    parameters = 'timestamp=' + timestamp;
  }
  return parameters;
}
