import {
  PaginationMeta,
  PaginatedResponse,
  SimplePaginatedResponse,
} from './paginated-response.dto';

describe('paginated-response.dto', () => {
  describe('PaginationMeta', () => {
    describe('create', () => {
      it('should calculate totalPages correctly', () => {
        const meta = PaginationMeta.create({ total: 100, page: 1, limit: 10 });
        expect(meta.totalPages).toBe(10);
      });

      it('should calculate totalPages with remainder', () => {
        const meta = PaginationMeta.create({ total: 95, page: 1, limit: 10 });
        expect(meta.totalPages).toBe(10);
      });

      it('should calculate totalPages for exact division', () => {
        const meta = PaginationMeta.create({ total: 50, page: 1, limit: 25 });
        expect(meta.totalPages).toBe(2);
      });

      it('should handle zero total', () => {
        const meta = PaginationMeta.create({ total: 0, page: 1, limit: 10 });
        expect(meta.totalPages).toBe(0);
      });

      it('should set hasNext to true when not on last page', () => {
        const meta = PaginationMeta.create({ total: 100, page: 5, limit: 10 });
        expect(meta.hasNext).toBe(true);
      });

      it('should set hasNext to false when on last page', () => {
        const meta = PaginationMeta.create({ total: 100, page: 10, limit: 10 });
        expect(meta.hasNext).toBe(false);
      });

      it('should set hasNext to false when page exceeds totalPages', () => {
        const meta = PaginationMeta.create({ total: 100, page: 15, limit: 10 });
        expect(meta.hasNext).toBe(false);
      });

      it('should set hasPrevious to false on first page', () => {
        const meta = PaginationMeta.create({ total: 100, page: 1, limit: 10 });
        expect(meta.hasPrevious).toBe(false);
      });

      it('should set hasPrevious to true when not on first page', () => {
        const meta = PaginationMeta.create({ total: 100, page: 2, limit: 10 });
        expect(meta.hasPrevious).toBe(true);
      });

      it('should set hasPrevious to true on last page', () => {
        const meta = PaginationMeta.create({ total: 100, page: 10, limit: 10 });
        expect(meta.hasPrevious).toBe(true);
      });

      it('should handle single page correctly', () => {
        const meta = PaginationMeta.create({ total: 5, page: 1, limit: 10 });
        expect(meta.totalPages).toBe(1);
        expect(meta.hasNext).toBe(false);
        expect(meta.hasPrevious).toBe(false);
      });

      it('should set all properties correctly', () => {
        const meta = PaginationMeta.create({ total: 100, page: 3, limit: 20 });
        expect(meta.total).toBe(100);
        expect(meta.page).toBe(3);
        expect(meta.limit).toBe(20);
        expect(meta.totalPages).toBe(5);
        expect(meta.hasNext).toBe(true);
        expect(meta.hasPrevious).toBe(true);
      });
    });
  });

  describe('PaginatedResponse', () => {
    describe('create', () => {
      it('should create response with data and meta', () => {
        const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const response = PaginatedResponse.create(data, { total: 100, page: 1, limit: 10 });

        expect(response.data).toBe(data);
        expect(response.meta).toBeDefined();
        expect(response.meta.total).toBe(100);
        expect(response.meta.page).toBe(1);
        expect(response.meta.limit).toBe(10);
      });

      it('should handle empty data array', () => {
        const response = PaginatedResponse.create([], { total: 0, page: 1, limit: 10 });

        expect(response.data).toEqual([]);
        expect(response.meta.total).toBe(0);
      });

      it('should create correct meta from pagination params', () => {
        const data = ['a', 'b', 'c'];
        const response = PaginatedResponse.create(data, { total: 50, page: 2, limit: 25 });

        expect(response.meta.totalPages).toBe(2);
        expect(response.meta.hasNext).toBe(false);
        expect(response.meta.hasPrevious).toBe(true);
      });

      it('should work with different data types', () => {
        interface User {
          name: string;
        }
        const data: User[] = [{ name: 'Alice' }, { name: 'Bob' }];
        const response = PaginatedResponse.create(data, { total: 2, page: 1, limit: 10 });

        expect(response.data).toBe(data);
        expect(response.data[0].name).toBe('Alice');
      });
    });
  });

  describe('SimplePaginatedResponse', () => {
    describe('create', () => {
      it('should create response with data and total', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const response = SimplePaginatedResponse.create(data, { total: 100 });

        expect(response.data).toBe(data);
        expect(response.total).toBe(100);
      });

      it('should set skip and take when provided', () => {
        const data = [{ id: 1 }];
        const response = SimplePaginatedResponse.create(data, { total: 100, skip: 10, take: 20 });

        expect(response.skip).toBe(10);
        expect(response.take).toBe(20);
      });

      it('should leave skip and take undefined when not provided', () => {
        const data = [{ id: 1 }];
        const response = SimplePaginatedResponse.create(data, { total: 100 });

        expect(response.skip).toBeUndefined();
        expect(response.take).toBeUndefined();
      });

      it('should set hasMore to true when more items exist', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const response = SimplePaginatedResponse.create(data, { total: 100, skip: 0, take: 10 });

        expect(response.hasMore).toBe(true);
      });

      it('should set hasMore to false when no more items exist', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const response = SimplePaginatedResponse.create(data, { total: 2, skip: 0, take: 10 });

        expect(response.hasMore).toBe(false);
      });

      it('should set hasMore to false when on last page', () => {
        const data = [{ id: 1 }];
        const response = SimplePaginatedResponse.create(data, { total: 11, skip: 10, take: 10 });

        expect(response.hasMore).toBe(false);
      });

      it('should handle skip undefined as 0 for hasMore calculation', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const response = SimplePaginatedResponse.create(data, { total: 100 });

        expect(response.hasMore).toBe(true);
      });

      it('should handle empty data array', () => {
        const response = SimplePaginatedResponse.create([], { total: 0 });

        expect(response.data).toEqual([]);
        expect(response.total).toBe(0);
        expect(response.hasMore).toBe(false);
      });

      it('should calculate hasMore correctly with skip and data length', () => {
        const data = [1, 2, 3, 4, 5];
        const response = SimplePaginatedResponse.create(data, { total: 10, skip: 5, take: 5 });

        // skip (5) + data.length (5) = 10, which equals total (10)
        expect(response.hasMore).toBe(false);
      });

      it('should calculate hasMore correctly when skip + data.length < total', () => {
        const data = [1, 2, 3];
        const response = SimplePaginatedResponse.create(data, { total: 20, skip: 10, take: 5 });

        // skip (10) + data.length (3) = 13, which is < total (20)
        expect(response.hasMore).toBe(true);
      });

      it('should work with different data types', () => {
        const data = ['item1', 'item2'];
        const response = SimplePaginatedResponse.create(data, { total: 50, skip: 0, take: 10 });

        expect(response.data).toBe(data);
        expect(response.hasMore).toBe(true);
      });
    });
  });
});
