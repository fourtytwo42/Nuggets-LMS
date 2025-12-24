import logger from '@/lib/logger';

describe('Logger', () => {
  it('should have info method', () => {
    expect(typeof logger.info).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof logger.error).toBe('function');
  });

  it('should have warn method', () => {
    expect(typeof logger.warn).toBe('function');
  });

  it('should have debug method', () => {
    expect(typeof logger.debug).toBe('function');
  });

  it('should call info without errors', () => {
    expect(() => logger.info('Test message')).not.toThrow();
  });

  it('should call error without errors', () => {
    expect(() => logger.error('Test error')).not.toThrow();
  });

  it('should call warn without errors', () => {
    expect(() => logger.warn('Test warning')).not.toThrow();
  });

  it('should call debug without errors', () => {
    expect(() => logger.debug('Test debug')).not.toThrow();
  });
});
