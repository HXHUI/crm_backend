import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../../entities/product.entity';

export interface CreateProductDto {
  name: string;
  code?: string;
  category?: string;
  specification?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  status?: ProductStatus;
  mainImage?: string;
  detailImages?: string[];
  description?: string;
}

export interface UpdateProductDto {
  name?: string;
  code?: string;
  category?: string;
  specification?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  status?: ProductStatus;
  mainImage?: string;
  detailImages?: string[];
  description?: string;
}

export interface QueryProductDto {
  search?: string;
  category?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async createProduct(createProductDto: CreateProductDto, tenantId: number) {
    // 验证详情图数量不超过9张
    if (createProductDto.detailImages && createProductDto.detailImages.length > 9) {
      throw new BadRequestException('详情图最多只能上传9张');
    }

    const product = this.productRepository.create({
      ...createProductDto,
      tenantId,
    });

    return await this.productRepository.save(product);
  }

  async findAllProducts(query: QueryProductDto, tenantId: number) {
    const { search, category, status, page = 1, limit = 10 } = query;

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.code LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 分类筛选
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    // 排序和分页
    queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findProductById(id: number, tenantId: number) {
    const product = await this.productRepository.findOne({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('产品不存在');
    }

    return product;
  }

  async updateProduct(id: number, updateProductDto: UpdateProductDto, tenantId: number) {
    const product = await this.findProductById(id, tenantId);

    // 验证详情图数量不超过9张
    if (updateProductDto.detailImages && updateProductDto.detailImages.length > 9) {
      throw new BadRequestException('详情图最多只能上传9张');
    }

    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async deleteProduct(id: number, tenantId: number) {
    const product = await this.findProductById(id, tenantId);
    await this.productRepository.softDelete(id);
  }

  async deleteBatchProducts(ids: number[], tenantId: number) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids })
      .andWhere('product.tenantId = :tenantId', { tenantId })
      .getMany();

    if (products.length !== ids.length) {
      throw new NotFoundException('部分产品不存在或无权限删除');
    }

    await this.productRepository.softDelete(ids);
  }
}

