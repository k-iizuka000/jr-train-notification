import { 
  ErrorHandler, 
  AppError, 
  ErrorType, 
  ErrorLevel,
  errorHandler 
} from '@/lib/error-handler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    // エラーログをクリア
    errorHandler.clearErrorLog();
    // コンソールのモック
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'group').mockImplementation();
    jest.spyOn(console, 'groupEnd').mockImplementation();
    jest.spyOn(console, 'trace').mockImplementation();
    jest.spyOn(console, 'table').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleError', () => {
    it('AppErrorをそのまま返す', () => {
      const originalError = new AppError(
        ErrorType.NETWORK_ERROR,
        'ネットワークエラー',
        ErrorLevel.ERROR
      );

      const result = errorHandler.handleError(originalError);
      
      expect(result).toBe(originalError);
      expect(errorHandler.getErrorLog()).toHaveLength(1);
    });

    it('通常のErrorをAppErrorに変換する', () => {
      const originalError = new Error('Network request failed');
      
      const result = errorHandler.handleError(originalError, 'API Call');
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.originalError).toBe(originalError);
    });

    it('未知のエラーをAppErrorに変換する', () => {
      const unknownError = 'Something went wrong';
      
      const result = errorHandler.handleError(unknownError);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('エラータイプを正しく推定する', () => {
      const testCases = [
        { message: 'Network error occurred', expectedType: ErrorType.NETWORK_ERROR },
        { message: 'Scraping failed', expectedType: ErrorType.SCRAPING_ERROR },
        { message: 'Push notification error', expectedType: ErrorType.NOTIFICATION_ERROR },
        { message: 'Permission denied', expectedType: ErrorType.PERMISSION_ERROR },
        { message: 'Storage quota exceeded', expectedType: ErrorType.STORAGE_ERROR },
        { message: 'Invalid input', expectedType: ErrorType.VALIDATION_ERROR },
        { message: 'Random error', expectedType: ErrorType.UNKNOWN_ERROR },
      ];

      testCases.forEach(({ message, expectedType }) => {
        const error = new Error(message);
        const result = errorHandler.handleError(error);
        expect(result.type).toBe(expectedType);
      });
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('エラータイプに応じた適切なメッセージを返す', () => {
      const error = new AppError(
        ErrorType.SCRAPING_ERROR,
        'Technical error message'
      );

      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('JR東日本のサイトから情報を取得できませんでした。しばらく経ってから再度お試しください。');
    });

    it('ErrorTypeを直接渡しても動作する', () => {
      const message = errorHandler.getUserFriendlyMessage(ErrorType.NETWORK_ERROR);
      
      expect(message).toBe('ネットワーク接続に問題があります。インターネット接続を確認してください。');
    });

    it('未知のエラータイプにはデフォルトメッセージを返す', () => {
      const error = new AppError(
        'CUSTOM_ERROR' as ErrorType,
        'Custom error'
      );

      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('予期しないエラーが発生しました。');
    });
  });

  describe('getErrorLog', () => {
    it('エラーログを取得できる', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
      
      const log = errorHandler.getErrorLog();
      
      expect(log).toHaveLength(2);
      expect(log[0].error.message).toBe('Error 1');
      expect(log[1].error.message).toBe('Error 2');
    });

    it('指定した件数のログを取得できる', () => {
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }
      
      const log = errorHandler.getErrorLog(3);
      
      expect(log).toHaveLength(3);
      expect(log[0].error.message).toBe('Error 2');
      expect(log[2].error.message).toBe('Error 4');
    });

    it('ログが100件を超えると古いものから削除される', () => {
      for (let i = 0; i < 150; i++) {
        errorHandler.handleError(new Error(`Error ${i}`));
      }
      
      const log = errorHandler.getErrorLog();
      
      expect(log).toHaveLength(100);
      expect(log[0].error.message).toBe('Error 50');
      expect(log[99].error.message).toBe('Error 149');
    });
  });

  describe('getErrorStats', () => {
    it('エラータイプごとの統計を取得できる', () => {
      errorHandler.handleError(new Error('Network error'));
      errorHandler.handleError(new Error('Network failed'));
      errorHandler.handleError(new Error('Scraping error'));
      errorHandler.handleError(new Error('Unknown'));
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats[ErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats[ErrorType.SCRAPING_ERROR]).toBe(1);
      expect(stats[ErrorType.UNKNOWN_ERROR]).toBe(1);
    });
  });

  describe('isCriticalError', () => {
    it('重大なエラーを正しく判定する', () => {
      const criticalError = new AppError(
        ErrorType.UNKNOWN_ERROR,
        'Critical',
        ErrorLevel.CRITICAL
      );
      
      expect(errorHandler.isCriticalError(criticalError)).toBe(true);
    });

    it('スクレイピングエラーを重大と判定する', () => {
      const scrapingError = new AppError(
        ErrorType.SCRAPING_ERROR,
        'Scraping failed',
        ErrorLevel.ERROR
      );
      
      expect(errorHandler.isCriticalError(scrapingError)).toBe(true);
    });

    it('ストレージエラーを重大と判定する', () => {
      const storageError = new AppError(
        ErrorType.STORAGE_ERROR,
        'Storage full',
        ErrorLevel.ERROR
      );
      
      expect(errorHandler.isCriticalError(storageError)).toBe(true);
    });

    it('通常のエラーは重大でないと判定する', () => {
      const normalError = new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid input',
        ErrorLevel.WARNING
      );
      
      expect(errorHandler.isCriticalError(normalError)).toBe(false);
    });
  });

  describe('clearErrorLog', () => {
    it('エラーログをクリアできる', () => {
      errorHandler.handleError(new Error('Error 1'));
      errorHandler.handleError(new Error('Error 2'));
      
      expect(errorHandler.getErrorLog()).toHaveLength(2);
      
      errorHandler.clearErrorLog();
      
      expect(errorHandler.getErrorLog()).toHaveLength(0);
    });
  });
});