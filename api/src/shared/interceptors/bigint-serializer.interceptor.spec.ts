import { BigIntSerializerInterceptor } from './bigint-serializer.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';

describe('BigIntSerializerInterceptor', () => {
  let interceptor: BigIntSerializerInterceptor;

  const mockContext = {} as ExecutionContext;
  const createHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  beforeEach(() => {
    interceptor = new BigIntSerializerInterceptor();
  });

  it('should convert BigInt values to strings', async () => {
    const handler = createHandler({ id: BigInt(123), name: 'test' });
    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));
    expect(result).toEqual({ id: '123', name: 'test' });
  });

  it('should handle nested BigInt values', async () => {
    const handler = createHandler({ user: { id: BigInt(42) }, items: [BigInt(1), BigInt(2)] });
    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));
    expect(result).toEqual({ user: { id: '42' }, items: ['1', '2'] });
  });

  it('should preserve Date objects', async () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const handler = createHandler({ createdAt: date, name: 'test' });
    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));
    expect((result as Record<string, unknown>).createdAt).toBe(date);
  });

  it('should preserve null and undefined', async () => {
    const handler = createHandler({ a: null, b: undefined });
    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));
    expect(result).toEqual({ a: null, b: undefined });
  });

  it('should handle arrays', async () => {
    const handler = createHandler([{ id: BigInt(1) }, { id: BigInt(2) }]);
    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('should pass through primitive values', async () => {
    const handler = createHandler('hello');
    const result = await lastValueFrom(interceptor.intercept(mockContext, handler));
    expect(result).toBe('hello');
  });
});
