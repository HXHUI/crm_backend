import { Injectable, Inject, Logger } from '@nestjs/common';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: any) {
    // 监听连接状态
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis已连接');
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
    });

    this.redis.on('close', () => {
      this.isConnected = false;
    });

    this.redis.on('error', () => {
      this.isConnected = false;
    });

    // 异步检查初始连接状态（不阻塞构造函数）
    this.checkConnection().catch(() => {
      // 静默处理错误，已在 checkConnection 中记录日志
    });
  }

  private async checkConnection(): Promise<void> {
    try {
      await this.redis.ping();
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      this.logger.warn('Redis未连接，将在无Redis模式下运行');
    }
  }

  private async safeExecute<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    operationName: string,
  ): Promise<T> {
    if (!this.isConnected) {
      try {
        await this.redis.ping();
        this.isConnected = true;
      } catch (error) {
        // Redis不可用，返回默认值
        return defaultValue;
      }
    }

    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Redis操作失败 (${operationName}): ${error.message}`);
      this.isConnected = false;
      return defaultValue;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.safeExecute(
      () => this.redis.get(key),
      null,
      'get',
    );
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.safeExecute(
      async () => {
        if (ttl) {
          await this.redis.setex(key, ttl, value);
        } else {
          await this.redis.set(key, value);
        }
      },
      undefined,
      'set',
    );
  }

  async del(key: string): Promise<void> {
    await this.safeExecute(
      () => this.redis.del(key),
      undefined,
      'del',
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.safeExecute(
      async () => {
        const result = await this.redis.exists(key);
        return result === 1;
      },
      false,
      'exists',
    );
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.safeExecute(
      () => this.redis.expire(key, seconds),
      undefined,
      'expire',
    );
  }

  async ttl(key: string): Promise<number> {
    return this.safeExecute(
      () => this.redis.ttl(key),
      -1,
      'ttl',
    );
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.safeExecute(
      () => this.redis.hget(key, field),
      null,
      'hget',
    );
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.safeExecute(
      () => this.redis.hset(key, field, value),
      undefined,
      'hset',
    );
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.safeExecute(
      () => this.redis.hdel(key, field),
      undefined,
      'hdel',
    );
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.safeExecute(
      () => this.redis.hgetall(key),
      {},
      'hgetall',
    );
  }

  async lpush(key: string, ...values: string[]): Promise<void> {
    await this.safeExecute(
      () => this.redis.lpush(key, ...values),
      undefined,
      'lpush',
    );
  }

  async rpop(key: string): Promise<string | null> {
    return this.safeExecute(
      () => this.redis.rpop(key),
      null,
      'rpop',
    );
  }

  async llen(key: string): Promise<number> {
    return this.safeExecute(
      () => this.redis.llen(key),
      0,
      'llen',
    );
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.safeExecute(
      () => this.redis.lrange(key, start, stop),
      [],
      'lrange',
    );
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.safeExecute(
      () => this.redis.sadd(key, ...members),
      undefined,
      'sadd',
    );
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.safeExecute(
      () => this.redis.srem(key, ...members),
      undefined,
      'srem',
    );
  }

  async smembers(key: string): Promise<string[]> {
    return this.safeExecute(
      () => this.redis.smembers(key),
      [],
      'smembers',
    );
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return this.safeExecute(
      async () => {
        const result = await this.redis.sismember(key, member);
        return result === 1;
      },
      false,
      'sismember',
    );
  }

  async flushdb(): Promise<void> {
    await this.safeExecute(
      () => this.redis.flushdb(),
      undefined,
      'flushdb',
    );
  }

  async ping(): Promise<string> {
    try {
      return await this.redis.ping();
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 检查Redis是否已连接
   */
  async isRedisConnected(): Promise<boolean> {
    try {
      await this.redis.ping();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }
}
