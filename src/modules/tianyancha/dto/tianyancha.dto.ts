// 天眼查API响应DTO

export interface TianyanchaCompanySearchResult {
  id: string;
  name: string;
  unifiedSocialCreditCode?: string;
  legalRepresentative?: string;
  registeredAddress?: string;
  operatingStatus?: string;
  [key: string]: any;
}

export interface TianyanchaCompanyDetail {
  // 基本信息
  unifiedSocialCreditCode?: string;
  companyName?: string;
  legalRepresentative?: string;
  operatingStatus?: string;
  registeredCapital?: number;
  paidInCapital?: number;
  businessRegistrationNumber?: string;
  organizationCode?: string;
  establishmentDate?: string;
  companyType?: string;
  businessTerm?: string;
  registrationAuthority?: string;
  approvalDate?: string;
  registeredAddress?: string;
  businessScope?: string;

  // 主要人员
  personnel?: Array<{
    name?: string;
    position?: string;
  }>;

  // 股东信息
  shareholders?: Array<{
    shareholderName?: string;
    shareholdingRatio?: number;
    shareholderType?: string;
    investmentAmount?: number;
  }>;

  // 分支机构
  branches?: Array<{
    companyName?: string;
    personInCharge?: string;
    establishmentDate?: string;
    operatingStatus?: string;
  }>;

  // 对外投资
  investments?: Array<{
    investedCompany?: string;
    shareholderType?: string;
    shareholdingRatio?: number;
    investmentAmount?: number;
    // 天眼查原始字段
    tianyanchaId?: number;
    regStatus?: string;
    amount?: number;
    amountSuffix?: string;
    paidinTime?: number;
    establishmentTime?: number;
    establishmentDate?: Date;
    regCapital?: string;
    subscriptionTime?: number;
    subscriptionDate?: Date;
    type?: number;
    percent?: string;
    legalPersonName?: string;
    businessScope?: string;
    orgType?: string;
    creditCode?: string;
    alias?: string;
    category?: string;
    personType?: number;
    base?: string;
  }>;

  // 变更记录
  changeRecords?: Array<{
    changeDate?: string;
    changeItem?: string;
    beforeChange?: string;
    afterChange?: string;
  }>;

  [key: string]: any;
}

