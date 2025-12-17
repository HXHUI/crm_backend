import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SolutionLibraryService,
  CreateSolutionDto,
} from './solution-library.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('solution-library')
@UseGuards(AuthGuard('jwt'))
export class SolutionLibraryController {
  constructor(private readonly solutionService: SolutionLibraryService) {}

  @Post('from-customer/:customerId')
  async createFromCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateSolutionDto,
    @CurrentUser() user: any,
  ) {
    const solution = await this.solutionService.createSolutionFromCustomer(
      customerId,
      dto,
      user.memberId,
      user.tenantId,
    );
    return {
      code: 201,
      message: '创建方案成功',
      data: solution,
    };
  }

  @Post('from-opportunity/:opportunityId')
  async createFromOpportunity(
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @Body() dto: CreateSolutionDto,
    @CurrentUser() user: any,
  ) {
    const solution = await this.solutionService.createSolutionFromOpportunity(
      opportunityId,
      dto,
      user.memberId,
      user.tenantId,
    );
    return {
      code: 201,
      message: '创建方案成功',
      data: solution,
    };
  }

  @Get('extract/customer/:customerId')
  async extractCustomerData(
    @Param('customerId', ParseIntPipe) customerId: number,
    @CurrentUser() user: any,
  ) {
    const data = await this.solutionService.extractCustomerDataForSolution(
      customerId,
      user.tenantId,
    );
    return {
      code: 200,
      message: '提取数据成功',
      data,
    };
  }

  @Get('extract/opportunity/:opportunityId')
  async extractOpportunityData(
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @CurrentUser() user: any,
  ) {
    const data = await this.solutionService.extractOpportunityDataForSolution(
      opportunityId,
      user.tenantId,
    );
    return {
      code: 200,
      message: '提取数据成功',
      data,
    };
  }

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Query('result') result?: string,
    @Query('sourceType') sourceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    const solutions = await this.solutionService.findAllSolutions(
      {
        search,
        industry,
        result: result as any,
        sourceType: sourceType as any,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      },
      user.tenantId,
    );
    return {
      code: 200,
      message: '获取方案列表成功',
      data: solutions,
    };
  }

  @Get(':id')
  async getSolution(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const solution = await this.solutionService.getSolutionById(id, user.tenantId);
    return {
      code: 200,
      message: '获取方案成功',
      data: solution,
    };
  }

  @Patch(':id')
  async updateSolution(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateSolutionDto>,
    @CurrentUser() user: any,
  ) {
    const solution = await this.solutionService.updateSolution(
      id,
      dto,
      user.tenantId,
    );
    return {
      code: 200,
      message: '更新方案成功',
      data: solution,
    };
  }

  @Post(':id/delete')
  async deleteSolution(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    await this.solutionService.deleteSolution(id, user.tenantId);
    return {
      code: 200,
      message: '删除方案成功',
    };
  }
}

