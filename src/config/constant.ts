/* eslint-disable @typescript-eslint/no-var-requires */

import { Logger } from '@nestjs/common';

const ccxt = require('ccxt');

export const LEVERAGE = 10;
export const API_KEY =
  'yje4IfdYeeqfejZQQvirUFWILe2XFAEX7re0Mby8nOFovQC6GA1IGoPiryNn2zOxfOMe190cZdSHsY1u3P1Rdg';
export const API_SECRET =
  'UBTcnxOch11arDwftRdBzLeEo7VvUiXYLZYurGrjPCDli2diul93RM5LXK7DVykhgRn6GeOmozxWiJwmd8w';

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

function splitSymbol(symbol) {
  const suffix = 'USDT';
  if (symbol.endsWith(suffix)) {
    const base = symbol.slice(0, -suffix.length);
    return `${base}-${suffix}`;
  } else {
    // Trường hợp không hợp lệ, bạn có thể xử lý tùy ý
    throw new Error("Symbol does not end with 'USDT'");
  }
}

export function generateParams(str) {
  const [symbol, side, price] = str.split(' ');
  const modifiedSymbol = splitSymbol(symbol);
  const { TP, SL } = calculateTPSLWithLeverage(Number(price), LEVERAGE);
  console.log(modifiedSymbol);
  const result = {
    symbol: modifiedSymbol,
    side,
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
  Logger.log(result);
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
