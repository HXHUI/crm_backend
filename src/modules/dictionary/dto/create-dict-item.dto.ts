export interface CreateDictItemDto {
  typeCode: string;
  value: string;
  label: string;
  parentId?: number;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}


