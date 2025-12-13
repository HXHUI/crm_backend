import {
  Injectable,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BusinessInfo,
  BusinessPersonnel,
  BusinessShareholder,
  BusinessBranch,
  BusinessInvestment,
  BusinessChangeRecord,
} from '../../entities/business-info.entity';
import { Customer } from '../../entities/customer.entity';
import { Lead } from '../../entities/lead.entity';
import { TianyanchaService } from '../tianyancha/tianyancha.service';
import { TianyanchaCompanyDetail } from '../tianyancha/dto/tianyancha.dto';

@Injectable()
export class BusinessInfoService {
  private readonly logger = new Logger(BusinessInfoService.name);
  private readonly cacheDays: number;

  constructor(
    @InjectRepository(BusinessInfo)
    private readonly businessInfoRepo: Repository<BusinessInfo>,
    @InjectRepository(BusinessPersonnel)
    private readonly personnelRepo: Repository<BusinessPersonnel>,
    @InjectRepository(BusinessShareholder)
    private readonly shareholderRepo: Repository<BusinessShareholder>,
    @InjectRepository(BusinessBranch)
    private readonly branchRepo: Repository<BusinessBranch>,
    @InjectRepository(BusinessInvestment)
    private readonly investmentRepo: Repository<BusinessInvestment>,
    @InjectRepository(BusinessChangeRecord)
    private readonly changeRecordRepo: Repository<BusinessChangeRecord>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly tianyanchaService: TianyanchaService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.cacheDays = parseInt(
      this.configService.get<string>('BUSINESS_INFO_CACHE_DAYS') || '30',
      10,
    );
  }

  /**
   * 获取工商信息（优先从缓存读取）
   * @param customerId 客户ID
   * @returns 工商信息
   */
  async getBusinessInfo(customerId: number): Promise<BusinessInfo | null> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if (!customer.companyName) {
      return null;
    }

    // 查找缓存的工商信息
    let businessInfo = await this.businessInfoRepo.findOne({
      where: { customerId },
      relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
    });

    // 如果存在但已过期，返回过期标记
    if (businessInfo && businessInfo.expiresAt && businessInfo.expiresAt < new Date()) {
      return businessInfo; // 返回过期数据，前端可以提示用户刷新
    }

    return businessInfo;
  }

  /**
   * 刷新工商信息
   * @param customerId 客户ID
   * @param force 是否强制刷新（即使未过期）
   * @returns 工商信息
   */
  async refreshBusinessInfo(
    customerId: number,
    force = false,
  ): Promise<BusinessInfo> {
    this.logger.log(`[refreshBusinessInfo] 开始刷新工商信息，customerId: ${customerId}, force: ${force}`);
    
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      this.logger.warn(`[refreshBusinessInfo] 客户不存在，customerId: ${customerId}`);
      throw new NotFoundException('客户不存在');
    }

    this.logger.log(`[refreshBusinessInfo] 找到客户: ${customer.companyName || '无公司名称'}`);

    if (!customer.companyName) {
      this.logger.warn(`[refreshBusinessInfo] 客户没有公司名称，customerId: ${customerId}`);
      throw new HttpException('客户没有公司名称，无法查询工商信息', HttpStatus.BAD_REQUEST);
    }

    // 检查是否已有缓存且未过期
    const existingInfo = await this.businessInfoRepo.findOne({
      where: { customerId },
    });

    if (existingInfo && !force) {
      if (existingInfo.expiresAt && existingInfo.expiresAt >= new Date()) {
        // 未过期，直接返回
        this.logger.log(`[refreshBusinessInfo] 找到未过期的缓存数据，直接返回，customerId: ${customerId}`);
        return await this.businessInfoRepo.findOne({
          where: { id: existingInfo.id },
          relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
        }) as BusinessInfo;
      } else {
        this.logger.log(`[refreshBusinessInfo] 缓存数据已过期，需要刷新，customerId: ${customerId}`);
      }
    } else {
      this.logger.log(`[refreshBusinessInfo] 没有缓存数据或强制刷新，customerId: ${customerId}`);
    }

    // 调用天眼查API
    let companyDetail: TianyanchaCompanyDetail;
    try {
      this.logger.log(`[refreshBusinessInfo] 开始调用天眼查API查询企业: ${customer.companyName}`);
      // 优先使用统一社会信用代码查询（如果客户有的话）
      // 这里假设客户实体可能有统一社会信用代码字段，如果没有则使用公司名称
      companyDetail = await this.tianyanchaService.queryByCompanyName(
        customer.companyName,
      );
      this.logger.log(`天眼查API调用成功，获取到企业信息: ${companyDetail.companyName || '未知'}`);
    } catch (error: any) {
      this.logger.error(`调用天眼查API失败: ${error.message}`, {
        companyName: customer.companyName,
        error: error.message,
        status: error.status,
        response: error.response?.data,
        stack: error.stack,
      });
      
      // 提供更详细的错误信息
      let errorMessage = error.message;
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.includes('天眼查API错误')) {
        errorMessage = error.message;
      } else if (error.message?.includes('未找到企业信息')) {
        errorMessage = `未找到企业"${customer.companyName}"的工商信息，请检查公司名称是否正确`;
      } else {
        errorMessage = `获取工商信息失败: ${error.message}`;
      }
      
      throw new HttpException(
        errorMessage,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 使用事务保存数据
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 保存或更新主表
      let businessInfo: BusinessInfo;
      if (existingInfo) {
        businessInfo = existingInfo;
        // 更新基本信息
        this.updateBusinessInfoFields(businessInfo, companyDetail);
      } else {
        businessInfo = this.businessInfoRepo.create({
          customerId,
          tenantId: customer.tenantId,
          ...this.mapCompanyDetailToBusinessInfo(companyDetail),
        });
      }

      businessInfo.lastSyncTime = new Date();
      businessInfo.expiresAt = new Date(
        Date.now() + this.cacheDays * 24 * 60 * 60 * 1000,
      );

      businessInfo = await queryRunner.manager.save(businessInfo);

      // 删除旧的子表数据
      await queryRunner.manager.delete(BusinessPersonnel, {
        businessInfoId: businessInfo.id,
      });
      await queryRunner.manager.delete(BusinessShareholder, {
        businessInfoId: businessInfo.id,
      });
      await queryRunner.manager.delete(BusinessBranch, {
        businessInfoId: businessInfo.id,
      });
      await queryRunner.manager.delete(BusinessInvestment, {
        businessInfoId: businessInfo.id,
      });
      await queryRunner.manager.delete(BusinessChangeRecord, {
        businessInfoId: businessInfo.id,
      });

      // 保存主要人员
      if (companyDetail.personnel && companyDetail.personnel.length > 0) {
        const personnelList = companyDetail.personnel.map((p) =>
          queryRunner.manager.create(BusinessPersonnel, {
            businessInfoId: businessInfo.id,
            name: p.name,
            position: p.position,
          }),
        );
        await queryRunner.manager.save(BusinessPersonnel, personnelList);
      }

      // 保存股东信息
      if (companyDetail.shareholders && companyDetail.shareholders.length > 0) {
        const shareholderList = companyDetail.shareholders.map((s) =>
          queryRunner.manager.create(BusinessShareholder, {
            businessInfoId: businessInfo.id,
            shareholderName: s.shareholderName,
            shareholdingRatio: s.shareholdingRatio,
            shareholderType: s.shareholderType,
            investmentAmount: s.investmentAmount,
          }),
        );
        await queryRunner.manager.save(BusinessShareholder, shareholderList);
      }

      // 保存分支机构
      if (companyDetail.branches && companyDetail.branches.length > 0) {
        const branchList = companyDetail.branches.map((b) =>
          queryRunner.manager.create(BusinessBranch, {
            businessInfoId: businessInfo.id,
            companyName: b.companyName,
            personInCharge: b.personInCharge,
            establishmentDate: b.establishmentDate
              ? new Date(b.establishmentDate)
              : undefined,
            operatingStatus: b.operatingStatus,
          }),
        );
        await queryRunner.manager.save(BusinessBranch, branchList);
      }

      // 保存对外投资
      if (companyDetail.investments && companyDetail.investments.length > 0) {
        this.logger.debug(`[syncBusinessInfo] 准备保存 ${companyDetail.investments.length} 条对外投资数据`);
        const investmentList = companyDetail.investments.map((i: any, index: number) => {
          const investmentData = {
            businessInfoId: businessInfo.id,
            investedCompany: i.investedCompany,
            shareholderType: i.shareholderType,
            shareholdingRatio: i.shareholdingRatio,
            investmentAmount: i.investmentAmount,
            // 保存所有原始字段
            tianyanchaId: i.tianyanchaId,
            regStatus: i.regStatus,
            amount: i.amount,
            amountSuffix: i.amountSuffix,
            paidinTime: i.paidinTime,
            establishmentTime: i.establishmentTime,
            establishmentDate: i.establishmentDate,
            regCapital: i.regCapital,
            subscriptionTime: i.subscriptionTime,
            subscriptionDate: i.subscriptionDate,
            type: i.type,
            percent: i.percent,
            legalPersonName: i.legalPersonName,
            businessScope: i.businessScope,
            orgType: i.orgType,
            creditCode: i.creditCode,
            alias: i.alias,
            category: i.category,
            personType: i.personType,
            base: i.base,
          };
          this.logger.debug(`[syncBusinessInfo] 第 ${index + 1} 条对外投资数据:`, JSON.stringify(investmentData, null, 2));
          return queryRunner.manager.create(BusinessInvestment, investmentData);
        });
        await queryRunner.manager.save(BusinessInvestment, investmentList);
        this.logger.log(`[syncBusinessInfo] 成功保存 ${investmentList.length} 条对外投资数据`);
      }

      // 保存变更记录
      if (companyDetail.changeRecords && companyDetail.changeRecords.length > 0) {
        const changeRecordList = companyDetail.changeRecords.map((c) =>
          queryRunner.manager.create(BusinessChangeRecord, {
            businessInfoId: businessInfo.id,
            changeDate: c.changeDate ? new Date(c.changeDate) : undefined,
            changeItem: c.changeItem,
            beforeChange: c.beforeChange,
            afterChange: c.afterChange,
          }),
        );
        await queryRunner.manager.save(BusinessChangeRecord, changeRecordList);
      }

      await queryRunner.commitTransaction();

      // 重新加载完整数据
      return await this.businessInfoRepo.findOne({
        where: { id: businessInfo.id },
        relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
      }) as BusinessInfo;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`保存工商信息失败: ${error.message}`, error.stack);
      throw new HttpException(
        `保存工商信息失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 检查并刷新过期数据
   * @param customerId 客户ID
   * @returns 是否已刷新
   */
  async checkAndRefreshIfExpired(customerId: number): Promise<boolean> {
    const businessInfo = await this.businessInfoRepo.findOne({
      where: { customerId },
    });

    if (!businessInfo) {
      return false;
    }

    if (businessInfo.expiresAt && businessInfo.expiresAt < new Date()) {
      try {
        await this.refreshBusinessInfo(customerId, true);
        return true;
      } catch (error: any) {
        this.logger.warn(`自动刷新工商信息失败: ${error.message}`);
        return false;
      }
    }

    return false;
  }

  /**
   * 通过公司名称获取工商信息（优先从缓存读取）
   * 注意：工商信息只与客户ID关联，不与线索ID关联，所以通过公司名称查询
   * @param companyName 公司名称
   * @param tenantId 租户ID（可选，用于过滤）
   * @returns 工商信息
   */
  async getBusinessInfoByCompanyName(
    companyName: string,
    tenantId?: number,
  ): Promise<BusinessInfo | null> {
    if (!companyName || !companyName.trim()) {
      return null;
    }

    // 通过公司名称查找缓存的工商信息（优先查找有客户关联的）
    let businessInfo = await this.businessInfoRepo.findOne({
      where: [
        { companyName: companyName.trim(), customerId: Not(IsNull()) },
        { companyName: companyName.trim() },
      ],
      relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
      order: { customerId: 'DESC' }, // 优先返回有客户关联的
    });

    // 如果指定了租户ID，进一步过滤
    if (tenantId && businessInfo && businessInfo.tenantId !== tenantId) {
      // 如果找到的工商信息不属于当前租户，尝试查找当前租户的
      const tenantBusinessInfo = await this.businessInfoRepo.findOne({
        where: { companyName: companyName.trim(), tenantId },
        relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
      });
      if (tenantBusinessInfo) {
        businessInfo = tenantBusinessInfo;
      }
    }

    // 如果存在但已过期，返回过期标记
    if (businessInfo && businessInfo.expiresAt && businessInfo.expiresAt < new Date()) {
      return businessInfo; // 返回过期数据，前端可以提示用户刷新
    }

    return businessInfo;
  }

  /**
   * 通过公司名称刷新工商信息
   * 注意：工商信息只与客户ID关联，不与线索ID关联，所以通过公司名称查询和保存
   * @param companyName 公司名称
   * @param tenantId 租户ID
   * @param force 是否强制刷新（即使未过期）
   * @returns 工商信息
   */
  async refreshBusinessInfoByCompanyName(
    companyName: string,
    tenantId: number,
    force = false,
  ): Promise<BusinessInfo> {
    this.logger.log(`[refreshBusinessInfoByCompanyName] 开始刷新工商信息，companyName: ${companyName}, tenantId: ${tenantId}, force: ${force}`);

    if (!companyName || !companyName.trim()) {
      this.logger.warn(`[refreshBusinessInfoByCompanyName] 公司名称为空`);
      throw new HttpException('公司名称不能为空，无法查询工商信息', HttpStatus.BAD_REQUEST);
    }

    const trimmedCompanyName = companyName.trim();

    // 检查是否已有缓存且未过期
    const existingInfo = await this.businessInfoRepo.findOne({
      where: { companyName: trimmedCompanyName, tenantId },
    });

    if (existingInfo && !force) {
      if (existingInfo.expiresAt && existingInfo.expiresAt >= new Date()) {
        // 未过期，直接返回
        this.logger.log(`[refreshBusinessInfoByCompanyName] 找到未过期的缓存数据，直接返回，companyName: ${trimmedCompanyName}`);
        return await this.businessInfoRepo.findOne({
          where: { id: existingInfo.id },
          relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
        }) as BusinessInfo;
      } else {
        this.logger.log(`[refreshBusinessInfoByCompanyName] 缓存数据已过期，需要刷新，companyName: ${trimmedCompanyName}`);
      }
    } else {
      this.logger.log(`[refreshBusinessInfoByCompanyName] 没有缓存数据或强制刷新，companyName: ${trimmedCompanyName}`);
    }

    // 调用天眼查API
    let companyDetail: TianyanchaCompanyDetail;
    try {
      companyDetail = await this.tianyanchaService.queryByCompanyName(trimmedCompanyName);
      this.logger.log(`[refreshBusinessInfoByCompanyName] 天眼查API查询成功，companyName: ${trimmedCompanyName}`);
    } catch (error: any) {
      this.logger.error(`[refreshBusinessInfoByCompanyName] 天眼查API查询失败，companyName: ${trimmedCompanyName}`, error);
      throw new HttpException(
        `查询工商信息失败: ${error.message || '未知错误'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 使用事务保存数据
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let businessInfo: BusinessInfo;

      if (existingInfo) {
        businessInfo = existingInfo;
        this.updateBusinessInfoFields(businessInfo, companyDetail);
      } else {
        businessInfo = this.businessInfoRepo.create({
          tenantId,
          ...this.mapCompanyDetailToBusinessInfo(companyDetail),
        });
      }

      businessInfo.lastSyncTime = new Date();
      businessInfo.expiresAt = new Date(
        Date.now() + this.cacheDays * 24 * 60 * 60 * 1000,
      );

      businessInfo = await queryRunner.manager.save(businessInfo);

      // 保存子表数据
      if (companyDetail.personnel && companyDetail.personnel.length > 0) {
        await queryRunner.manager.delete(BusinessPersonnel, {
          businessInfoId: businessInfo.id,
        });
        await queryRunner.manager.save(
          BusinessPersonnel,
          companyDetail.personnel.map((p) => ({
            businessInfoId: businessInfo.id,
            name: p.name,
            position: p.position,
          })),
        );
      }

      if (companyDetail.shareholders && companyDetail.shareholders.length > 0) {
        await queryRunner.manager.delete(BusinessShareholder, {
          businessInfoId: businessInfo.id,
        });
        await queryRunner.manager.save(
          BusinessShareholder,
          companyDetail.shareholders.map((s) => ({
            businessInfoId: businessInfo.id,
            shareholderName: s.shareholderName,
            shareholdingRatio: s.shareholdingRatio,
            shareholderType: s.shareholderType,
            investmentAmount: s.investmentAmount,
          })),
        );
      }

      if (companyDetail.branches && companyDetail.branches.length > 0) {
        await queryRunner.manager.delete(BusinessBranch, {
          businessInfoId: businessInfo.id,
        });
        await queryRunner.manager.save(
          BusinessBranch,
          companyDetail.branches.map((b) => ({
            businessInfoId: businessInfo.id,
            companyName: b.companyName,
            personInCharge: b.personInCharge,
            establishmentDate: b.establishmentDate
              ? new Date(b.establishmentDate)
              : undefined,
            operatingStatus: b.operatingStatus,
          })),
        );
      }

      if (companyDetail.investments && companyDetail.investments.length > 0) {
        await queryRunner.manager.delete(BusinessInvestment, {
          businessInfoId: businessInfo.id,
        });
        this.logger.debug(`[refreshBusinessInfoByCompanyName] 准备保存 ${companyDetail.investments.length} 条对外投资数据`);
        const investmentList = companyDetail.investments.map((i: any, index: number) => {
          const investmentData = {
            businessInfoId: businessInfo.id,
            investedCompany: i.investedCompany,
            shareholderType: i.shareholderType,
            shareholdingRatio: i.shareholdingRatio,
            investmentAmount: i.investmentAmount,
            // 保存所有原始字段
            tianyanchaId: i.tianyanchaId,
            regStatus: i.regStatus,
            amount: i.amount,
            amountSuffix: i.amountSuffix,
            paidinTime: i.paidinTime,
            establishmentTime: i.establishmentTime,
            establishmentDate: i.establishmentDate,
            regCapital: i.regCapital,
            subscriptionTime: i.subscriptionTime,
            subscriptionDate: i.subscriptionDate,
            type: i.type,
            percent: i.percent,
            legalPersonName: i.legalPersonName,
            businessScope: i.businessScope,
            orgType: i.orgType,
            creditCode: i.creditCode,
            alias: i.alias,
            category: i.category,
            personType: i.personType,
            base: i.base,
          };
          this.logger.debug(`[refreshBusinessInfoByCompanyName] 第 ${index + 1} 条对外投资数据:`, JSON.stringify(investmentData, null, 2));
          return queryRunner.manager.create(BusinessInvestment, investmentData);
        });
        await queryRunner.manager.save(BusinessInvestment, investmentList);
        this.logger.log(`[refreshBusinessInfoByCompanyName] 成功保存 ${investmentList.length} 条对外投资数据`);
      }

      if (companyDetail.changeRecords && companyDetail.changeRecords.length > 0) {
        await queryRunner.manager.delete(BusinessChangeRecord, {
          businessInfoId: businessInfo.id,
        });
        await queryRunner.manager.save(
          BusinessChangeRecord,
          companyDetail.changeRecords.map((c) => ({
            businessInfoId: businessInfo.id,
            changeDate: c.changeDate ? new Date(c.changeDate) : undefined,
            changeItem: c.changeItem,
            beforeChange: c.beforeChange,
            afterChange: c.afterChange,
          })),
        );
      }

      await queryRunner.commitTransaction();

      return await this.businessInfoRepo.findOne({
        where: { id: businessInfo.id },
        relations: ['personnel', 'shareholders', 'branches', 'investments', 'changeRecords'],
      }) as BusinessInfo;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[refreshBusinessInfoByCompanyName] 保存工商信息失败，companyName: ${trimmedCompanyName}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 搜索企业（用于创建线索）
   * @param keyword 搜索关键词
   * @returns 企业列表
   */
  async searchCompany(keyword: string) {
    return await this.tianyanchaService.searchCompany(keyword);
  }

  /**
   * 更新工商信息字段
   */
  private updateBusinessInfoFields(
    businessInfo: BusinessInfo,
    companyDetail: TianyanchaCompanyDetail,
  ): void {
    const mapped = this.mapCompanyDetailToBusinessInfo(companyDetail);
    Object.assign(businessInfo, mapped);
  }

  /**
   * 映射天眼查数据到工商信息实体
   */
  private mapCompanyDetailToBusinessInfo(
    companyDetail: TianyanchaCompanyDetail,
  ): Partial<BusinessInfo> {
    return {
      unifiedSocialCreditCode: companyDetail.unifiedSocialCreditCode,
      companyName: companyDetail.companyName,
      legalRepresentative: companyDetail.legalRepresentative,
      operatingStatus: companyDetail.operatingStatus,
      registeredCapital: companyDetail.registeredCapital
        ? typeof companyDetail.registeredCapital === 'string'
          ? parseFloat(companyDetail.registeredCapital) || undefined
          : companyDetail.registeredCapital
        : undefined,
      paidInCapital: companyDetail.paidInCapital
        ? typeof companyDetail.paidInCapital === 'string'
          ? parseFloat(companyDetail.paidInCapital) || undefined
          : companyDetail.paidInCapital
        : undefined,
      businessRegistrationNumber: companyDetail.businessRegistrationNumber,
      organizationCode: companyDetail.organizationCode,
      establishmentDate: companyDetail.establishmentDate
        ? new Date(companyDetail.establishmentDate)
        : undefined,
      companyType: companyDetail.companyType,
      businessTerm: companyDetail.businessTerm,
      registrationAuthority: companyDetail.registrationAuthority,
      approvalDate: companyDetail.approvalDate
        ? new Date(companyDetail.approvalDate)
        : undefined,
      registeredAddress: companyDetail.registeredAddress,
      businessScope: companyDetail.businessScope,
    };
  }
}

