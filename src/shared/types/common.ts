/**
 * Common Type Definitions
 * Shared types used across the application
 */

export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'banned';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: Status;
  startDate?: Date;
  endDate?: Date;
}

