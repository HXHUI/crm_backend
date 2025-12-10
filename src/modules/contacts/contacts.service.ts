import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Contact, ContactType } from '../../entities/contact.entity';
import { CreateContactDto, UpdateContactDto, QueryContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  /**
   * 验证循环引用：检查是否会将联系人或其下级设置为上级
   */
  private async validateNoCircularReference(
    contactId: number | null,
    parentId: number | undefined,
    tenantId: number,
  ): Promise<void> {
    if (!parentId) {
      return; // 没有设置上级，无需验证
    }

    // 不能将自己设置为上级
    if (contactId && contactId === parentId) {
      throw new ConflictException('不能将自己设置为上级联系人');
    }

    // 检查 parentId 是否存在且属于同一租户
    const parent = await this.contactRepository.findOne({
      where: { id: parentId, tenantId },
    });

    if (!parent) {
      throw new NotFoundException('上级联系人不存在');
    }

    // 如果正在更新联系人，检查 parentId 是否是当前联系人的下级
    if (contactId) {
      const isDescendant = await this.isDescendant(parentId, contactId, tenantId);
      if (isDescendant) {
        throw new ConflictException('不能将下级联系人设置为上级，这会导致循环引用');
      }
    }
  }

  /**
   * 检查 targetId 是否是 ancestorId 的后代（下级）
   */
  private async isDescendant(
    ancestorId: number,
    targetId: number,
    tenantId: number,
  ): Promise<boolean> {
    let currentId: number | null = targetId;
    const visited = new Set<number>();

    // 向上遍历，检查是否会到达 ancestorId
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      if (currentId === ancestorId) {
        return true; // 找到了，targetId 是 ancestorId 的后代
      }

      const contact = await this.contactRepository.findOne({
        where: { id: currentId, tenantId },
        select: ['id', 'parentId'],
      });

      if (!contact || !contact.parentId) {
        break; // 到达根节点
      }

      currentId = contact.parentId;
    }

    return false;
  }

  async create(createDto: CreateContactDto, tenantId: number): Promise<Contact> {
    // 验证循环引用
    await this.validateNoCircularReference(null, createDto.parentId, tenantId);

    // 如果设置了 parentId，验证 parentId 是否属于同一客户
    if (createDto.parentId) {
      const parent = await this.contactRepository.findOne({
        where: { id: createDto.parentId, tenantId },
        select: ['id', 'customerId'],
      });

      if (!parent) {
        throw new NotFoundException('上级联系人不存在');
      }

      if (parent.customerId !== createDto.customerId) {
        throw new ConflictException('上级联系人必须属于同一客户');
      }
    }

    // 如果设置为主要联系人，需要先将该客户的其他联系人设为非主要
    if (createDto.isPrimary) {
      await this.contactRepository.update(
        { customerId: createDto.customerId },
        { isPrimary: false }
      );
    }

    const contact = this.contactRepository.create({
      ...createDto,
      tenantId,
    });

    return await this.contactRepository.save(contact);
  }

  async findAll(queryDto: QueryContactDto, tenantId: number) {
    const { search, name, email, phone, type, customerId, page = 1, limit = 50 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .where('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL');

    // 模糊搜索：在姓名、邮箱、手机号中搜索
    if (search) {
      queryBuilder.andWhere(
        '(contact.name LIKE :search OR contact.email LIKE :search OR contact.phone LIKE :search)',
        { search: `%${search}%` }
      );
    } else {
      // 如果没有 search 参数，则使用独立的 name、email、phone 参数
      if (name) {
        queryBuilder.andWhere('contact.name LIKE :name', { name: `%${name}%` });
      }

      if (email) {
        queryBuilder.andWhere('contact.email LIKE :email', { email: `%${email}%` });
      }

      if (phone) {
        queryBuilder.andWhere('contact.phone LIKE :phone', { phone: `%${phone}%` });
      }
    }

    if (type) {
      queryBuilder.andWhere('contact.type = :type', { type });
    }

    if (customerId) {
      queryBuilder.andWhere('contact.customerId = :customerId', { customerId });
    }

    const [contacts, total] = await queryBuilder
      .orderBy('contact.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      contacts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, tenantId: number): Promise<Contact> {
    const contact = await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .where('contact.id = :id', { id })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .getOne();

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    return contact;
  }

  async update(id: number, updateDto: UpdateContactDto, tenantId: number): Promise<Contact> {
    const contact = await this.findOne(id, tenantId);

    // 验证循环引用
    if (updateDto.parentId !== undefined) {
      await this.validateNoCircularReference(id, updateDto.parentId, tenantId);

      // 如果设置了 parentId，验证 parentId 是否属于同一客户
      if (updateDto.parentId !== null) {
        const parent = await this.contactRepository.findOne({
          where: { id: updateDto.parentId, tenantId },
          select: ['id', 'customerId'],
        });

        if (!parent) {
          throw new NotFoundException('上级联系人不存在');
        }

        if (parent.customerId !== contact.customerId) {
          throw new ConflictException('上级联系人必须属于同一客户');
        }
      }
    }

    // 如果设置为主要联系人，需要先将该客户的其他联系人设为非主要
    if (updateDto.isPrimary && !contact.isPrimary) {
      await this.contactRepository.update(
        { customerId: contact.customerId },
        { isPrimary: false }
      );
    }

    Object.assign(contact, updateDto);
    return await this.contactRepository.save(contact);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const contact = await this.findOne(id, tenantId);
    await this.contactRepository.softDelete(id);
  }

  async batchRemove(ids: number[], tenantId: number): Promise<void> {
    // 检查所有联系人是否存在且属于当前租户
    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.id IN (:...ids)', { ids })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .getMany();

    if (contacts.length !== ids.length) {
      throw new NotFoundException('部分联系人不存在');
    }

    await this.contactRepository.softDelete(ids);
  }

  async getContactStats(tenantId: number) {
    const total = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .getCount();

    const typeStats = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .groupBy('contact.type')
      .getRawMany();

    const primaryCount = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .andWhere('contact.isPrimary = :isPrimary', { isPrimary: true })
      .getCount();

    return {
      total,
      typeStats,
      primaryCount,
    };
  }

  async getContactsByCustomer(customerId: number, tenantId: number) {
    return await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.parent', 'parent')
      .where('contact.customerId = :customerId', { customerId })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .orderBy('contact.isPrimary', 'DESC')
      .addOrderBy('contact.createdAt', 'DESC')
      .getMany();
  }

  /**
   * 获取联系人的所有下级联系人（直接下级）
   */
  async getChildren(contactId: number, tenantId: number): Promise<Contact[]> {
    return await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .where('contact.parentId = :contactId', { contactId })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .orderBy('contact.createdAt', 'ASC')
      .getMany();
  }

  /**
   * 获取联系人的上级联系人
   */
  async getParent(contactId: number, tenantId: number): Promise<Contact | null> {
    const contact = await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.parent', 'parent')
      .leftJoinAndSelect('parent.customer', 'customer')
      .where('contact.id = :contactId', { contactId })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .getOne();

    return contact?.parent || null;
  }

  /**
   * 获取联系人的完整层级树（包括所有下级）
   */
  async getHierarchyTree(contactId: number, tenantId: number): Promise<Contact> {
    const contact = await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .leftJoinAndSelect('contact.parent', 'parent')
      .where('contact.id = :contactId', { contactId })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .getOne();

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 递归加载所有下级
    const loadChildren = async (parent: Contact): Promise<Contact> => {
      const children = await this.getChildren(parent.id, tenantId);
      parent.children = await Promise.all(children.map((child) => loadChildren(child)));
      return parent;
    };

    return await loadChildren(contact);
  }

  /**
   * 获取客户的所有联系人层级树（按层级组织）
   */
  async getContactsHierarchyByCustomer(customerId: number, tenantId: number): Promise<Contact[]> {
    // 获取所有联系人
    const allContacts = await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.parent', 'parent')
      .leftJoinAndSelect('contact.customer', 'customer')
      .where('contact.customerId = :customerId', { customerId })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .orderBy('contact.isPrimary', 'DESC')
      .addOrderBy('contact.createdAt', 'ASC')
      .getMany();

    // 构建树形结构
    const contactMap = new Map<number, Contact & { children?: Contact[] }>();
    const roots: Contact[] = [];

    // 初始化所有联系人
    allContacts.forEach((contact) => {
      contactMap.set(contact.id, { ...contact, children: [] });
    });

    // 构建树
    allContacts.forEach((contact) => {
      const node = contactMap.get(contact.id)!;
      if (contact.parentId && contactMap.has(contact.parentId)) {
        const parent = contactMap.get(contact.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
