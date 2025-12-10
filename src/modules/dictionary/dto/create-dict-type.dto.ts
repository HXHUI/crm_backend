export interface CreateDictTypeDto {
  code: string;
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}


