import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService, CreateProductDto, UpdateProductDto, QueryProductDto } from './products.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(AuthGuard('jwt'))
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const product = await this.productsService.createProduct(createProductDto, tenantId);
    return {
      code: 201,
      message: '创建产品成功',
      data: product
    };
  }

  @Get()
  async findAllProducts(
    @Query() query: QueryProductDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.productsService.findAllProducts(query, tenantId);
    return {
      code: 200,
      message: '获取产品列表成功',
      data: result
    };
  }

  @Get(':id')
  async findProductById(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const product = await this.productsService.findProductById(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '获取产品详情成功',
      data: product
    };
  }

  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const product = await this.productsService.updateProduct(parseInt(id, 10), updateProductDto, tenantId);
    return {
      code: 200,
      message: '更新产品成功',
      data: product
    };
  }

  @Delete('batch')
  @HttpCode(HttpStatus.OK)
  async deleteBatchProducts(@Body('ids') ids: string[], @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.productsService.deleteBatchProducts(ids.map(id => parseInt(id, 10)), tenantId);
    return {
      code: 200,
      message: '批量删除产品成功'
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.productsService.deleteProduct(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '删除产品成功'
    };
  }
}

