import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Notification } from '../../entities/notification.entity';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  tenantId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`客户端连接失败：未提供 token - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub || payload.userId;
      client.tenantId = payload.tenantId;

      if (!client.userId) {
        this.logger.warn(`客户端连接失败：无法获取 userId - ${client.id}`);
        client.disconnect();
        return;
      }

      // 存储用户 socket 连接
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      this.logger.log(`用户连接成功 - userId: ${client.userId}, socketId: ${client.id}`);
    } catch (error) {
      this.logger.error(`客户端连接失败 - ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`用户断开连接 - userId: ${client.userId}, socketId: ${client.id}`);
    }
  }

  /**
   * 发送通知给特定用户
   */
  sendToUser(userId: number, notification: Notification) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
      });
      this.logger.log(`已发送通知给用户 - userId: ${userId}, notificationId: ${notification.id}`);
    }
  }

  /**
   * 广播未读数量更新
   */
  broadcastUnreadCount(userId: number, count: number) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit('unread-count', { count });
      });
    }
  }

  /**
   * 从 socket 中提取 token
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // 从 handshake auth 中获取
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    // 从 query 参数中获取
    const token = client.handshake.query.token;
    if (token && typeof token === 'string') {
      return token;
    }

    // 从 headers 中获取
    const headers = client.handshake.headers;
    const authHeader = headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
      }
    }

    return null;
  }
}

