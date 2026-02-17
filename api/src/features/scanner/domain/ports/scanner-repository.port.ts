import { LibraryScan } from '../entities/library-scan.entity';

export interface IScannerRepository {
  findById(id: string): Promise<LibraryScan | null>;
  findAll(skip: number, take: number): Promise<LibraryScan[]>;
  findLatest(): Promise<LibraryScan | null>;
  findByStatus(status: string): Promise<LibraryScan[]>;
  create(scan: LibraryScan): Promise<LibraryScan>;
  update(id: string, data: Partial<LibraryScan>): Promise<LibraryScan | null>;
  count(): Promise<number>;
}

export const SCANNER_REPOSITORY = 'IScannerRepository';
