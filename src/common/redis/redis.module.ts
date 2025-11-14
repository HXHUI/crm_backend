import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = require('ioredis');
        const logger = new Logger('RedisModule');
        
        const redisClient = new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true, // 延迟连接，避免启动时立即连接
          retryStrategy: (times: number) => {
            // 重试策略：最多重试3次，然后停止
            if (times > 3) {
              logger.warn('Redis连接失败，已停止重试。应用将在无Redis模式下运行。');
              return null; // 停止重试
            }
            return Math.min(times * 200, 2000);
          },
        });

        // 处理连接错误，避免未处理的错误事件
        redisClient.on('error', (error: Error) => {
          logger.warn(`Redis连接错误: ${error.message}`);
          // 不抛出错误，让应用继续运行
        });

        redisClient.on('connect', () => {
          logger.log('Redis连接成功');
        });

        redisClient.on('ready', () => {
          logger.log('Redis已就绪');
        });

        redisClient.on('close', () => {
          logger.warn('Redis连接已关闭');
        });

        // 尝试连接，但不阻塞应用启动
        redisClient.connect().catch((error: Error) => {
          logger.warn(`Redis初始连接失败: ${error.message}，应用将在无Redis模式下运行`);
        });

        return redisClient;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
