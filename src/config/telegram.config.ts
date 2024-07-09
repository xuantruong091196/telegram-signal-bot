import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  botToken: '7278171834:AAHbKJnEk85ljUttKec5nIr3Z9vkdNiT-cw',
  chatId: '-1002225209314',
}));
