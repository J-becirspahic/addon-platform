export * from './auth';
export * from './organization';
export * from './addon';
export * from './notification';

export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: 'organization' | 'addon' | 'member' | 'version';
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
