// エラータイプの定義
export enum ErrorType {
  SCRAPING_ERROR = 'SCRAPING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// エラーレベルの定義
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// カスタムエラークラス
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public level: ErrorLevel = ErrorLevel.ERROR,
    public originalError?: Error | unknown,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ユーザー向けエラーメッセージのマッピング
const userFriendlyMessages: Record<ErrorType, string> = {
  [ErrorType.SCRAPING_ERROR]: 'JR東日本のサイトから情報を取得できませんでした。しばらく経ってから再度お試しください。',
  [ErrorType.NETWORK_ERROR]: 'ネットワーク接続に問題があります。インターネット接続を確認してください。',
  [ErrorType.VALIDATION_ERROR]: '入力された情報に誤りがあります。',
  [ErrorType.PERMISSION_ERROR]: '必要な権限がありません。ブラウザの設定を確認してください。',
  [ErrorType.NOTIFICATION_ERROR]: '通知の送信に失敗しました。通知設定を確認してください。',
  [ErrorType.STORAGE_ERROR]: 'データの保存に失敗しました。ストレージの空き容量を確認してください。',
  [ErrorType.UNKNOWN_ERROR]: '予期しないエラーが発生しました。'
};

// エラーハンドリングユーティリティ
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: Array<{
    timestamp: Date;
    error: AppError;
    context?: string;
  }> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * エラーを処理してAppErrorに変換
   */
  handleError(
    error: unknown,
    context?: string,
    details?: Record<string, any>
  ): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      // エラーメッセージからタイプを推定
      const type = this.inferErrorType(error);
      appError = new AppError(
        type,
        error.message,
        ErrorLevel.ERROR,
        error,
        details
      );
    } else {
      appError = new AppError(
        ErrorType.UNKNOWN_ERROR,
        '不明なエラーが発生しました',
        ErrorLevel.ERROR,
        error,
        details
      );
    }

    // エラーログに記録
    this.logError(appError, context);

    return appError;
  }

  /**
   * エラータイプを推定
   */
  private inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('scraping') || message.includes('xpath')) {
      return ErrorType.SCRAPING_ERROR;
    }
    if (message.includes('notification') || message.includes('push')) {
      return ErrorType.NOTIFICATION_ERROR;
    }
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorType.PERMISSION_ERROR;
    }
    if (message.includes('storage') || message.includes('quota')) {
      return ErrorType.STORAGE_ERROR;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * ユーザー向けエラーメッセージを取得
   */
  getUserFriendlyMessage(error: AppError | ErrorType): string {
    const type = error instanceof AppError ? error.type : error;
    return userFriendlyMessages[type] || userFriendlyMessages[ErrorType.UNKNOWN_ERROR];
  }

  /**
   * エラーをログに記録
   */
  private logError(error: AppError, context?: string): void {
    const logEntry = {
      timestamp: new Date(),
      error,
      context
    };

    this.errorLog.push(logEntry);

    // 開発環境ではコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${error.type} - ${context || 'Unknown Context'}`);
      console.error('Message:', error.message);
      console.error('Level:', error.level);
      if (error.originalError) {
        console.error('Original Error:', error.originalError);
      }
      if (error.details) {
        console.table(error.details);
      }
      console.trace('Stack Trace');
      console.groupEnd();
    } else {
      // 本番環境では簡潔なログ
      console.error(`[${error.type}] ${error.message}`, {
        context,
        timestamp: new Date().toISOString()
      });
    }

    // ログサイズの制限（最新100件のみ保持）
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  /**
   * エラーログを取得
   */
  getErrorLog(limit?: number): typeof this.errorLog {
    if (limit) {
      return this.errorLog.slice(-limit);
    }
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * エラー統計を取得
   */
  getErrorStats(): Record<ErrorType, number> {
    const stats: Record<string, number> = {};
    
    this.errorLog.forEach(entry => {
      const type = entry.error.type;
      stats[type] = (stats[type] || 0) + 1;
    });

    return stats as Record<ErrorType, number>;
  }

  /**
   * 重大なエラーかどうかを判定
   */
  isCriticalError(error: AppError): boolean {
    return error.level === ErrorLevel.CRITICAL || 
           error.type === ErrorType.SCRAPING_ERROR ||
           error.type === ErrorType.STORAGE_ERROR;
  }
}

// シングルトンインスタンスをエクスポート
export const errorHandler = ErrorHandler.getInstance();