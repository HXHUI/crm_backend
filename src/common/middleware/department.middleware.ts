import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DepartmentMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 从请求头获取当前部门ID
    const departmentId = req.headers['x-current-department-id'];
    
    // 如果存在 user 对象（JWT 验证后设置），添加 currentDepartmentId
    if (req.user) {
      (req.user as any).currentDepartmentId = departmentId 
        ? parseInt(departmentId as string, 10) 
        : undefined;
    }
    
    next();
  }
}

