import { Test, TestingModule } from '@nestjs/testing';
import { BingxService } from './bingx.service';

describe('BingxService', () => {
  let service: BingxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BingxService],
    }).compile();

    service = module.get<BingxService>(BingxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
