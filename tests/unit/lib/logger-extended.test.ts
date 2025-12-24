import logger from '@/lib/logger';

describe('Logger Extended Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should have all log levels available', () => {
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should log error messages', () => {
    const errorSpy = jest.spyOn(logger, 'error');
    logger.error('Test error message');
    expect(errorSpy).toHaveBeenCalledWith('Test error message');
    errorSpy.mockRestore();
  });

  it('should log info messages', () => {
    const infoSpy = jest.spyOn(logger, 'info');
    logger.info('Test info message');
    expect(infoSpy).toHaveBeenCalledWith('Test info message');
    infoSpy.mockRestore();
  });

  it('should log warn messages', () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    logger.warn('Test warn message');
    expect(warnSpy).toHaveBeenCalledWith('Test warn message');
    warnSpy.mockRestore();
  });

  it('should log debug messages', () => {
    const debugSpy = jest.spyOn(logger, 'debug');
    logger.debug('Test debug message');
    expect(debugSpy).toHaveBeenCalledWith('Test debug message');
    debugSpy.mockRestore();
  });

  it('should log with metadata', () => {
    const infoSpy = jest.spyOn(logger, 'info');
    logger.info('Test message', { userId: '123', action: 'test' });
    expect(infoSpy).toHaveBeenCalledWith('Test message', { userId: '123', action: 'test' });
    infoSpy.mockRestore();
  });
});
