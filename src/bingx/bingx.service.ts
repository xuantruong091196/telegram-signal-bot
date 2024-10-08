/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable, Logger } from '@nestjs/common';
import { API_KEY, API_SECRET, getParameters } from 'src/config/constant';
import axios from 'axios';
const CryptoJS = require('crypto-js');
@Injectable()
export class BingxService {
  async bingXOpenApiTest(path, method, payload) {
    const timestamp = new Date().getTime();
    const params = getParameters(payload, timestamp);
    const sign = CryptoJS.enc.Hex.stringify(
      CryptoJS.HmacSHA256(params || '', API_SECRET),
    );
    const url =
      'https' +
      '://' +
      'open-api.bingx.com' +
      path +
      '?' +
      getParameters(payload, timestamp, true) +
      '&signature=' +
      sign;
    const config = {
      method: method,
      url: url,
      headers: {
        'X-BX-APIKEY': API_KEY,
      },
      transformResponse: (resp) => {
        Logger.log(resp);
        return resp;
      },
    };
    const resp = await axios(config);
    Logger.log(resp.status);
    Logger.log(resp.data);
    return resp.data;
  }
  async createOrder(params) {
    const dataBalance = await this.getBalance();
    Logger.log(dataBalance);
    const { balance } = dataBalance;
    let quantity = 0;
    if (balance) {
      const maxMargin = (balance / 10) * 10;
      quantity = maxMargin / params.price;
    }
    return await this.bingXOpenApiTest(
      '/openApi/swap/v2/user/balance',
      'POST',
      { ...params, quantity },
    );
  }
  async setLeverange(params) {
    const { symbol, side } = params;
    return await this.bingXOpenApiTest(
      '/openApi/swap/v2/trade/leverage',
      'POST',
      {
        symbol,
        side,
        leverage: 10,
      },
    );
  }
  async getBalance() {
    const data = await this.bingXOpenApiTest(
      '/openApi/swap/v2/user/balance',
      'GET',
      {
        timestamp: Date.now(),
      },
    );
    return data;
  }
}
