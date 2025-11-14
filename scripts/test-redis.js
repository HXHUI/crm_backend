const Redis = require('ioredis');

async function testRedis() {
  console.log('🔍 测试 Redis 连接...\n');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryStrategy: (times) => {
      if (times > 3) {
        console.log('❌ Redis 连接失败，已停止重试');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  redis.on('connect', () => {
    console.log('✅ Redis 连接成功');
  });

  redis.on('ready', () => {
    console.log('✅ Redis 已就绪');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis 连接错误:', error.message);
  });

  try {
    const result = await redis.ping();
    console.log(`✅ Redis PING 响应: ${result}`);
    
    // 测试设置和获取
    await redis.set('test:key', 'test:value', 'EX', 10);
    const value = await redis.get('test:key');
    console.log(`✅ Redis SET/GET 测试成功: ${value}`);
    
    await redis.del('test:key');
    console.log('✅ Redis 测试完成，所有操作正常\n');
    
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis 测试失败:', error.message);
    await redis.quit();
    process.exit(1);
  }
}

testRedis();

