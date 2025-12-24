import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should combine class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should filter out falsy values', () => {
    expect(cn('class1', undefined, 'class2', null, false)).toBe('class1 class2');
  });

  it('should return empty string for no classes', () => {
    expect(cn()).toBe('');
  });

  it('should handle only falsy values', () => {
    expect(cn(undefined, null, false)).toBe('');
  });
});
