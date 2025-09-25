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

  async create(createDto: CreateContactDto, tenantId: string): Promise<Contact> {
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

  async findAll(queryDto: QueryContactDto, tenantId: string) {
    const { name, email, phone, type, customerId, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.customer', 'customer')
      .where('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL');

    if (name) {
      queryBuilder.andWhere('contact.name LIKE :name', { name: `%${name}%` });
    }

    if (email) {
      queryBuilder.andWhere('contact.email LIKE :email', { email: `%${email}%` });
    }

    if (phone) {
      queryBuilder.andWhere('contact.phone LIKE :phone', { phone: `%${phone}%` });
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

  async findOne(id: string, tenantId: string): Promise<Contact> {
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

  async update(id: string, updateDto: UpdateContactDto, tenantId: string): Promise<Contact> {
    const contact = await this.findOne(id, tenantId);

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

  async remove(id: string, tenantId: string): Promise<void> {
    const contact = await this.findOne(id, tenantId);
    await this.contactRepository.softDelete(id);
  }

  async batchRemove(ids: string[], tenantId: string): Promise<void> {
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

  async getContactStats(tenantId: string) {
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

  async getContactsByCustomer(customerId: string, tenantId: string) {
    return await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.customerId = :customerId', { customerId })
      .andWhere('contact.tenantId = :tenantId', { tenantId })
      .andWhere('contact.deletedAt IS NULL')
      .orderBy('contact.isPrimary', 'DESC')
      .addOrderBy('contact.createdAt', 'DESC')
      .getMany();
  }
}
