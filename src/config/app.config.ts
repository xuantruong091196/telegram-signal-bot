/* eslint-disable @typescript-eslint/no-var-requires */
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
}));
