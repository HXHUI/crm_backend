import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  TianyanchaCompanyDetail,
  TianyanchaCompanySearchResult,
} from './dto/tianyancha.dto';

@Injectable()
export class TianyanchaService {
  private readonly logger = new Logger(TianyanchaService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly axiosInstance: AxiosInstance;

  /**
   * 天眼查API错误代码映射
   */
  private static readonly ERROR_MESSAGES: Record<number, string> = {
    300000: '经查无结果',
    300001: '请求失败',
    300002: '账号失效',
    300003: '账号过期',
    300004: '访问频率过快',
    300005: '无权限访问此api',
    300006: '余额不足',
    300007: '剩余次数不足',
    300008: '缺少必要参数',
    300009: '账号信息有误',
    300010: 'URL不存在',
    300011: '此IP无权限访问此api',
    300012: '报告生成中',
  };

  /**
   * 获取天眼查API错误消息
   * @param errorCode 错误代码
   * @param reason 错误原因（可选）
   * @returns 错误消息
   */
  private getErrorMessage(errorCode: number, reason?: string): string {
    const message = TianyanchaService.ERROR_MESSAGES[errorCode] || `错误代码: ${errorCode}`;
    return reason ? `${message} - ${reason}` : message;
  }

  /**
   * 检查并处理天眼查API错误响应
   * @param data API响应数据
   * @param throwError 是否抛出异常（默认true）
   * @returns 如果有错误返回错误消息，否则返回null
   */
  private checkApiError(data: any, throwError = true): string | null {
    if (data && data.error_code !== undefined && data.error_code !== 0) {
      const errorCode = data.error_code;
      const errorMessage = this.getErrorMessage(errorCode, data.reason);
      if (throwError) {
        throw new HttpException(
          `天眼查API错误: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return errorMessage;
    }
    return null;
  }

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TIANYANCHA_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('TIANYANCHA_API_URL') || 'https://open.api.tianyancha.com';

    if (!this.apiKey) {
      this.logger.warn('TIANYANCHA_API_KEY is not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器，记录请求信息
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`天眼查API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('天眼查API请求拦截器错误:', error);
        return Promise.reject(error);
      },
    );

    // 添加响应拦截器，记录响应信息
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`天眼查API响应: ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`天眼查API响应错误: ${error.config?.url}`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * 搜索企业（用于创建线索时选择）
   * @param keyword 搜索关键词（公司名称或统一社会信用代码）
   * @returns 企业列表
   * 
   * API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/816-%E6%90%9C%E7%B4%A2.pdf
   */
  async searchCompany(keyword: string): Promise<TianyanchaCompanySearchResult[]> {
    if (!this.apiKey) {
      throw new HttpException('天眼查API密钥未配置', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // 使用天眼查搜索接口: /services/open/search/2.0
      // 接口文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/816-%E6%90%9C%E7%B4%A2.pdf
      const response = await this.axiosInstance.get('/services/open/search/2.0', {
        params: {
          word: keyword, // 关键词（必选）
          pageSize: 20,  // 每页条数（默认20条，最大20条）
          pageNum: 1,    // 当前页数（默认第1页）
        },
      });

      // 检查错误代码
      this.checkApiError(response.data);

      // 解析天眼查搜索接口返回的数据
      // 返回格式: { result: { total: 62, items: [...] } }
      if (response.data && response.data.result) {
        const result = response.data.result;
        
        // 检查是否有 items 数组
        if (result.items && Array.isArray(result.items)) {
          return result.items.map((item: any) => ({
            id: String(item.id || ''),
            name: item.name || '',
            unifiedSocialCreditCode: item.creditCode || '',
            legalRepresentative: item.legalPersonName || '',
            registeredAddress: item.base || '', // base字段表示省份，如果需要详细地址可能需要其他接口
            operatingStatus: item.regStatus || '',
          }));
        }
      }

      return [];
    } catch (error: any) {
      // 如果是HttpException，直接抛出
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`搜索企业失败: ${error.message}`, {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack,
      });

      // 检查是否是API返回的错误
      if (error.response?.data?.error_code !== undefined) {
        this.checkApiError(error.response.data);
      }

      throw new HttpException(
        `搜索企业失败: ${error.response?.data?.message || error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 通过公司名称查询完整工商信息
   * @param companyName 公司名称
   * @returns 完整工商信息
   * 
   * API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/1116-%E4%BC%81%E4%B8%9A%E5%9F%BA%E6%9C%AC%E4%BF%A1%E6%81%AF.pdf
   */
  async queryByCompanyName(companyName: string): Promise<TianyanchaCompanyDetail> {
    if (!this.apiKey) {
      throw new HttpException('天眼查API密钥未配置', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // API文档: http://open.api.tianyancha.com/services/open/ic/baseinfo/normal
      const response = await this.axiosInstance.get('/services/open/ic/baseinfo/normal', {
        params: {
          keyword: encodeURIComponent(companyName), // 需要URLEncode
        },
      });

      // 检查错误代码
      this.checkApiError(response.data);

      if (!response.data || !response.data.result) {
        throw new HttpException('未找到企业信息', HttpStatus.NOT_FOUND);
      }

      // 根据API文档，这个接口直接返回企业详细信息（result对象）
      const baseInfo = response.data.result;
      
      if (!baseInfo || (typeof baseInfo === 'object' && Object.keys(baseInfo).length === 0)) {
        throw new HttpException('未找到企业信息', HttpStatus.NOT_FOUND);
      }

      // 获取企业ID，用于查询子表数据
      const companyId = baseInfo.id ? String(baseInfo.id) : null;

      if (companyId) {
        // 如果有企业ID，获取完整数据（包括子表）
        return await this.getCompanyDetail(companyId);
      } else {
        // 如果没有ID，只返回基本信息
        return this.transformCompanyDetail({
          baseInfo,
          personnel: [],
          shareholders: [],
          branches: [],
          investments: [],
          changeRecords: [],
        });
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`查询企业信息失败: ${error.message}`, {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack,
      });
      
      // 检查是否是API返回的错误
      if (error.response?.data?.error_code !== undefined) {
        this.checkApiError(error.response.data);
      }
      
      throw new HttpException(
        `查询企业信息失败: ${error.response?.data?.message || error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 通过统一社会信用代码查询完整工商信息
   * @param creditCode 统一社会信用代码
   * @returns 完整工商信息
   * 
   * API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/1116-%E4%BC%81%E4%B8%9A%E5%9F%BA%E6%9C%AC%E4%BF%A1%E6%81%AF.pdf
   */
  async queryByCreditCode(creditCode: string): Promise<TianyanchaCompanyDetail> {
    if (!this.apiKey) {
      throw new HttpException('天眼查API密钥未配置', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // API文档: http://open.api.tianyancha.com/services/open/ic/baseinfo/normal
      const response = await this.axiosInstance.get('/services/open/ic/baseinfo/normal', {
        params: {
          keyword: encodeURIComponent(creditCode), // 需要URLEncode
        },
      });

      // 检查错误代码
      this.checkApiError(response.data);

      if (!response.data || !response.data.result) {
        throw new HttpException('未找到企业信息', HttpStatus.NOT_FOUND);
      }

      // 根据API文档，这个接口直接返回企业详细信息（result对象）
      const baseInfo = response.data.result;
      
      if (!baseInfo || (typeof baseInfo === 'object' && Object.keys(baseInfo).length === 0)) {
        throw new HttpException('未找到企业信息', HttpStatus.NOT_FOUND);
      }

      // 获取企业ID，用于查询子表数据
      const companyId = baseInfo.id ? String(baseInfo.id) : null;

      if (companyId) {
        // 如果有企业ID，获取完整数据（包括子表）
        return await this.getCompanyDetail(companyId);
      } else {
        // 如果没有ID，只返回基本信息
        return this.transformCompanyDetail({
          baseInfo,
          personnel: [],
          shareholders: [],
          branches: [],
          investments: [],
          changeRecords: [],
        });
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`查询企业信息失败: ${error.message}`, {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack,
      });
      throw new HttpException(
        `查询企业信息失败: ${error.response?.data?.message || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取企业详细信息
   * @param companyId 企业ID
   * @returns 完整工商信息
   */
  private async getCompanyDetail(companyId: string): Promise<TianyanchaCompanyDetail> {
    try {
      // 获取基本信息（使用企业ID作为keyword查询）
      const baseInfoResponse = await this.axiosInstance.get('/services/open/ic/baseinfo/normal', {
        params: {
          keyword: encodeURIComponent(companyId),
        },
      });
      
      // 检查错误代码
      this.checkApiError(baseInfoResponse.data);
      
      const baseInfo = baseInfoResponse.data?.result || baseInfoResponse.data || {};

      // 获取主要人员
      // API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/820-%E4%B8%BB%E8%A6%81%E4%BA%BA%E5%91%98.pdf
      let personnel: any[] = [];
      try {
        const personnelResponse = await this.axiosInstance.get('/services/open/ic/staff/2.0', {
          params: {
            keyword: encodeURIComponent(companyId),
            pageSize: 20,
            pageNum: 1,
          },
        });
        
        // 检查错误代码
        if (personnelResponse.data?.error_code === 0 && personnelResponse.data?.result?.items) {
          personnel = personnelResponse.data.result.items.map((item: any) => ({
            name: item.name,
            position: item.typeJoin && Array.isArray(item.typeJoin) ? item.typeJoin.join('、') : '',
          }));
        }
      } catch (error: any) {
        this.logger.warn(`获取主要人员失败: ${error.message}`);
      }

      // 获取股东信息
      // API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/821-%E4%BC%81%E4%B8%9A%E8%82%A1%E4%B8%9C.pdf
      let shareholders: any[] = [];
      try {
        const shareholderResponse = await this.axiosInstance.get('/services/open/ic/holder/2.0', {
          params: {
            keyword: encodeURIComponent(companyId),
            pageSize: 20,
            pageNum: 1,
            source: 1, // 1-工商登记
          },
        });
        
        // 检查错误代码
        if (shareholderResponse.data?.error_code === 0 && shareholderResponse.data?.result?.items) {
          shareholders = shareholderResponse.data.result.items.map((item: any) => {
            // 从capital数组中获取最新的认缴信息
            const latestCapital = item.capital && Array.isArray(item.capital) && item.capital.length > 0
              ? item.capital[item.capital.length - 1]
              : null;
            
            // 解析持股比例（从percent字符串中提取数字）
            let shareholdingRatio: number | undefined;
            if (latestCapital?.percent) {
              const percentMatch = latestCapital.percent.match(/([\d.]+)/);
              shareholdingRatio = percentMatch ? parseFloat(percentMatch[1]) : undefined;
            }
            
            // 解析投资金额（从amomon字符串中提取数字）
            let investmentAmount: number | undefined;
            if (latestCapital?.amomon) {
              const amountMatch = latestCapital.amomon.match(/([\d.]+)/);
              if (amountMatch) {
                let value = parseFloat(amountMatch[1]);
                if (latestCapital.amomon.includes('万')) {
                  value = value * 10000;
                } else if (latestCapital.amomon.includes('亿')) {
                  value = value * 100000000;
                }
                investmentAmount = value;
              }
            }
            
            return {
              shareholderName: item.name,
              shareholdingRatio,
              shareholderType: item.type === 1 ? '公司' : item.type === 2 ? '人' : '其它',
              investmentAmount,
            };
          });
        }
      } catch (error: any) {
        this.logger.warn(`获取股东信息失败: ${error.message}`);
      }

      // 获取分支机构
      // API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/824-%E5%88%86%E6%94%AF%E6%9C%BA%E6%9E%84.pdf
      let branches: any[] = [];
      try {
        const branchResponse = await this.axiosInstance.get('/services/open/ic/branch/2.0', {
          params: {
            keyword: encodeURIComponent(companyId),
            pageSize: 20,
            pageNum: 1,
          },
        });
        
        // 检查错误代码
        if (branchResponse.data?.error_code === 0 && branchResponse.data?.result?.items) {
          branches = branchResponse.data.result.items.map((item: any) => {
            // 解析时间戳
            let establishmentDate: string | undefined;
            if (item.establishTime) {
              const ts = typeof item.establishTime === 'string' 
                ? parseInt(item.establishTime, 10) 
                : item.establishTime;
              if (!isNaN(ts) && ts > 0) {
                const date = ts > 1000000000000 ? new Date(ts) : new Date(ts * 1000);
                if (!isNaN(date.getTime())) {
                  establishmentDate = date.toISOString().split('T')[0];
                }
              }
            }
            
            return {
              companyName: item.name,
              personInCharge: item.legalPersonName,
              establishmentDate,
              operatingStatus: item.regStatus,
            };
          });
        }
      } catch (error: any) {
        this.logger.warn(`获取分支机构失败: ${error.message}`);
      }

      // 获取对外投资
      // API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/823-%E5%AF%B9%E5%A4%96%E6%8A%95%E8%B5%84.pdf
      let investments: any[] = [];
      try {
        this.logger.debug(`[getCompanyDetail] 开始获取对外投资，companyId: ${companyId}`);
        const investmentResponse = await this.axiosInstance.get('/services/open/ic/invest/2.0', {
          params: {
            keyword: encodeURIComponent(companyId),
            pageSize: 20,
            pageNum: 1,
          },
        });
        
        // 记录完整的响应数据用于调试
        this.logger.debug(`[getCompanyDetail] 对外投资API完整响应:`, JSON.stringify(investmentResponse.data, null, 2));
        this.logger.debug(`[getCompanyDetail] 对外投资API响应类型:`, {
          isArray: Array.isArray(investmentResponse.data),
          hasErrorCode: investmentResponse.data?.error_code !== undefined,
          errorCode: investmentResponse.data?.error_code,
          hasResult: !!investmentResponse.data?.result,
          resultType: typeof investmentResponse.data?.result,
          resultIsArray: Array.isArray(investmentResponse.data?.result),
          hasItems: !!investmentResponse.data?.result?.items,
          itemsIsArray: Array.isArray(investmentResponse.data?.result?.items),
        });
        
        // 检查错误代码（对外投资接口不抛出异常，只记录警告）
        const errorMessage = this.checkApiError(investmentResponse.data, false);
        if (errorMessage) {
          this.logger.warn(`[getCompanyDetail] 对外投资API返回错误: ${errorMessage}`);
          // 如果是权限错误，不抛出异常，只记录警告，继续处理其他数据
          if (investmentResponse.data?.error_code === 300005) {
            this.logger.warn('[getCompanyDetail] 对外投资API无权限，跳过获取对外投资数据');
          }
        } else {
          // 尝试多种数据格式
          let items: any[] = [];
          
          // 格式1: { error_code: 0, result: { items: [...] } }
          if (investmentResponse.data?.result?.items && Array.isArray(investmentResponse.data.result.items)) {
            items = investmentResponse.data.result.items;
            this.logger.debug(`[getCompanyDetail] 使用格式1解析，找到 ${items.length} 条数据`);
          }
          // 格式2: { error_code: 0, result: [...] } (result直接是数组)
          else if (investmentResponse.data?.result && Array.isArray(investmentResponse.data.result)) {
            items = investmentResponse.data.result;
            this.logger.debug(`[getCompanyDetail] 使用格式2解析，找到 ${items.length} 条数据`);
          }
          // 格式3: { error_code: 0, data: [...] } (data是数组)
          else if (investmentResponse.data?.data && Array.isArray(investmentResponse.data.data)) {
            items = investmentResponse.data.data;
            this.logger.debug(`[getCompanyDetail] 使用格式3解析，找到 ${items.length} 条数据`);
          }
          // 格式4: 直接返回数组
          else if (Array.isArray(investmentResponse.data)) {
            items = investmentResponse.data;
            this.logger.debug(`[getCompanyDetail] 使用格式4解析，找到 ${items.length} 条数据`);
          }
          // 格式5: { error_code: 0, result: 单个对象 } (result是单个对象)
          else if (investmentResponse.data?.result && typeof investmentResponse.data.result === 'object' && investmentResponse.data.result.name) {
            items = [investmentResponse.data.result];
            this.logger.debug(`[getCompanyDetail] 使用格式5解析，找到 1 条数据（result是单个对象）`);
          }
          // 格式6: 单个对象（包装成数组）- 根据图片，返回的是单个对象
          else if (investmentResponse.data && typeof investmentResponse.data === 'object' && investmentResponse.data.name && !investmentResponse.data.error_code) {
            items = [investmentResponse.data];
            this.logger.debug(`[getCompanyDetail] 使用格式6解析，找到 1 条数据（单个对象）`);
          }
          // 格式7: { result: { data: [...] } } 或其他嵌套格式
          else if (investmentResponse.data?.result?.data && Array.isArray(investmentResponse.data.result.data)) {
            items = investmentResponse.data.result.data;
            this.logger.debug(`[getCompanyDetail] 使用格式7解析，找到 ${items.length} 条数据`);
          }
          
          if (items.length > 0) {
            investments = items.map((item: any, index: number) => {
              this.logger.debug(`[getCompanyDetail] 解析第 ${index + 1} 条对外投资数据:`, JSON.stringify(item, null, 2));
              
              // 解析持股比例（从 "49%" 格式中提取）
              let shareholdingRatio: number | undefined;
              if (item.percent) {
                const percentMatch = String(item.percent).match(/([\d.]+)/);
                shareholdingRatio = percentMatch ? parseFloat(percentMatch[1]) : undefined;
                this.logger.debug(`[getCompanyDetail] 持股比例解析: ${item.percent} -> ${shareholdingRatio}`);
              }
              
              // 解析投资金额（从 "600万人民币" 或 amount + amountSuffix 格式中提取）
              let investmentAmount: number | undefined;
              
              // 优先使用 amount + amountSuffix 格式（如：amount: 294, amountSuffix: "万元人民币"）
              if (item.amount !== undefined && item.amount !== null) {
                let value = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount));
                if (!isNaN(value)) {
                  if (item.amountSuffix) {
                    if (item.amountSuffix.includes('万')) {
                      value = value * 10000;
                    } else if (item.amountSuffix.includes('亿')) {
                      value = value * 100000000;
                    }
                  }
                  investmentAmount = value;
                  this.logger.debug(`[getCompanyDetail] 投资金额解析（amount方式）: ${item.amount} ${item.amountSuffix} -> ${investmentAmount}`);
                }
              }
              // 其次使用 regCapital 字段（如："600万人民币"）
              else if (item.regCapital) {
                const amountMatch = String(item.regCapital).match(/([\d.]+)/);
                if (amountMatch) {
                  let value = parseFloat(amountMatch[1]);
                  if (String(item.regCapital).includes('万')) {
                    value = value * 10000;
                  } else if (String(item.regCapital).includes('亿')) {
                    value = value * 100000000;
                  }
                  investmentAmount = value;
                  this.logger.debug(`[getCompanyDetail] 投资金额解析（regCapital方式）: ${item.regCapital} -> ${investmentAmount}`);
                }
              }
              
              // 获取公司名称：优先使用 name，如果没有则使用 creditCode 或其他字段
              const investedCompany = item.name || item.companyName || item.creditCode || item.alias || '未知公司';
              
              // 判断股东类型：personType 1=人，2=公司；type 1=公司，2=人
              let shareholderType = '其它';
              if (item.personType !== undefined && item.personType !== null) {
                shareholderType = item.personType === 1 ? '人' : item.personType === 2 ? '公司' : '其它';
              } else if (item.type !== undefined && item.type !== null) {
                shareholderType = item.type === 1 ? '公司' : item.type === 2 ? '人' : '其它';
              }
              
              const parsedItem = {
                investedCompany,
                shareholderType,
                shareholdingRatio,
                investmentAmount,
              };
              
              this.logger.debug(`[getCompanyDetail] 解析后的对外投资项:`, parsedItem);
              
              return parsedItem;
            });
            
            this.logger.log(`[getCompanyDetail] 成功解析 ${investments.length} 条对外投资数据`);
          } else {
            this.logger.warn(`[getCompanyDetail] 对外投资API返回数据为空或格式不匹配`);
            this.logger.debug(`[getCompanyDetail] 原始数据:`, JSON.stringify(investmentResponse.data, null, 2));
          }
        }
      } catch (error: any) {
        this.logger.error(`[getCompanyDetail] 获取对外投资失败: ${error.message}`, {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          stack: error.stack,
        });
      }

      // 获取变更记录
      // API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/822-%E5%8F%98%E6%9B%B4%E8%AE%B0%E5%BD%95.pdf
      let changeRecords: any[] = [];
      try {
        const changeRecordResponse = await this.axiosInstance.get('/services/open/ic/changeinfo/2.0', {
          params: {
            keyword: encodeURIComponent(companyId),
            pageSize: 20,
            pageNum: 1,
          },
        });
        
        // 检查错误代码
        if (changeRecordResponse.data?.error_code === 0 && changeRecordResponse.data?.result?.items) {
          changeRecords = changeRecordResponse.data.result.items.map((item: any) => {
            // 解析时间戳
            let changeDate: string | undefined;
            if (item.changeTime) {
              const ts = typeof item.changeTime === 'string' 
                ? parseInt(item.changeTime, 10) 
                : item.changeTime;
              if (!isNaN(ts) && ts > 0) {
                const date = ts > 1000000000000 ? new Date(ts) : new Date(ts * 1000);
                if (!isNaN(date.getTime())) {
                  changeDate = date.toISOString().split('T')[0];
                }
              }
            }
            
            return {
              changeDate,
              changeItem: item.changeItem,
              beforeChange: item.contentBefore,
              afterChange: item.contentAfter,
            };
          });
        }
      } catch (error: any) {
        this.logger.warn(`获取变更记录失败: ${error.message}`);
      }

      // 转换数据格式
      return this.transformCompanyDetail({
        baseInfo,
        personnel,
        shareholders,
        branches,
        investments,
        changeRecords,
      });
    } catch (error: any) {
      this.logger.error(`获取企业详细信息失败: ${error.message}`, {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack,
      });
      throw new HttpException(
        `获取企业详细信息失败: ${error.response?.data?.message || error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 转换天眼查数据格式为系统内部格式
   * 根据API文档: https://jindi-oss-open.oss-cn-beijing.aliyuncs.com/document/1116-%E4%BC%81%E4%B8%9A%E5%9F%BA%E6%9C%AC%E4%BF%A1%E6%81%AF.pdf
   */
  private transformCompanyDetail(data: any): TianyanchaCompanyDetail {
    const baseInfo = data.baseInfo || {};

    // 解析注册资本和实缴资本（字符串格式，如"77800.32万人民币"）
    const parseCapital = (capitalStr: string | undefined): number | undefined => {
      if (!capitalStr || typeof capitalStr !== 'string') return undefined;
      
      // 提取数字部分（支持小数点）
      const match = capitalStr.match(/([\d.]+)/);
      if (!match) return undefined;
      
      let value = parseFloat(match[1]);
      
      // 处理单位：万、亿等
      if (capitalStr.includes('万')) {
        value = value * 10000;
      } else if (capitalStr.includes('亿')) {
        value = value * 100000000;
      }
      
      return value;
    };

    // 解析时间戳为日期字符串（YYYY-MM-DD）
    const parseTimestamp = (timestamp: number | string | undefined): string | undefined => {
      if (!timestamp) return undefined;
      
      // 如果是字符串，尝试转换为数字
      const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
      
      if (isNaN(ts) || ts <= 0) return undefined;
      
      // 时间戳可能是秒或毫秒，需要判断
      const date = ts > 1000000000000 ? new Date(ts) : new Date(ts * 1000);
      
      if (isNaN(date.getTime())) return undefined;
      
      return date.toISOString().split('T')[0];
    };

    // 处理营业期限
    const formatBusinessTerm = (): string | undefined => {
      const fromTime = baseInfo.fromTime;
      const toTime = baseInfo.toTime;
      
      if (!fromTime) return undefined;
      
      const fromDate = parseTimestamp(fromTime);
      if (!fromDate) return undefined;
      
      if (!toTime || toTime === null) {
        return `${fromDate} 至 长期`;
      }
      
      const toDate = parseTimestamp(toTime);
      if (!toDate) return fromDate;
      
      return `${fromDate} 至 ${toDate}`;
    };

    return {
      unifiedSocialCreditCode: baseInfo.creditCode,
      companyName: baseInfo.name,
      legalRepresentative: baseInfo.legalPersonName,
      operatingStatus: baseInfo.regStatus,
      registeredCapital: parseCapital(baseInfo.regCapital),
      paidInCapital: parseCapital(baseInfo.actualCapital),
      businessRegistrationNumber: baseInfo.regNumber,
      organizationCode: baseInfo.orgNumber,
      establishmentDate: parseTimestamp(baseInfo.estiblishTime),
      companyType: baseInfo.companyOrgType,
      businessTerm: formatBusinessTerm(),
      registrationAuthority: baseInfo.regInstitute,
      approvalDate: parseTimestamp(baseInfo.approvedTime),
      registeredAddress: baseInfo.regLocation,
      businessScope: baseInfo.businessScope,

      // 主要人员（已经在 getCompanyDetail 中处理好了）
      personnel: data.personnel || [],

      // 股东信息（已经在 getCompanyDetail 中处理好了）
      shareholders: data.shareholders || [],

      // 分支机构（已经在 getCompanyDetail 中处理好了）
      branches: data.branches || [],

      // 对外投资（已经在 getCompanyDetail 中处理好了）
      investments: data.investments || [],

      // 变更记录（已经在 getCompanyDetail 中处理好了）
      changeRecords: data.changeRecords || [],
    };
  }
}

