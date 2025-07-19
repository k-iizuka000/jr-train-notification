import { EventEmitter } from 'events';

// ログレベル
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 99
}

// ログエントリーの型
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

// ログイベント
export interface LogEvents {
  log: (entry: LogEntry) => void;
  statusChange: (status: string, previousStatus: string | null) => void;
  notificationSent: (count: number, failed: number) => void;
  scrapingComplete: (status: string, duration: number) => void;
  error: (error: Error, context: string) => void;
}

// ロガーのオプション
export interface LoggerOptions {
  level: LogLevel;
  maxLogs: number;
  enableConsole: boolean;
  enableStatusHistory: boolean;
}

// デフォルトオプション
const defaultOptions: LoggerOptions = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  maxLogs: 1000,
  enableConsole: true,
  enableStatusHistory: true
};

export class Logger extends EventEmitter {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private statusHistory: Array<{
    timestamp: Date;
    status: string;
    previousStatus: string | null;
  }> = [];
  private options: LoggerOptions;

  private constructor(options: Partial<LoggerOptions> = {}) {
    super();
    this.options = { ...defaultOptions, ...options };
  }

  static getInstance(options?: Partial<LoggerOptions>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  // ログ出力
  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    if (level < this.options.level) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      error
    };

    // ログを保存
    this.logs.push(entry);
    if (this.logs.length > this.options.maxLogs) {
      this.logs = this.logs.slice(-this.options.maxLogs);
    }

    // イベントを発火
    this.emit('log', entry);

    // コンソール出力
    if (this.options.enableConsole) {
      this.consoleLog(entry);
    }
  }

  // コンソール出力
  private consoleLog(entry: LogEntry): void {
    const timestamp = entry.timestamp.toLocaleString('ja-JP');
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}]`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const message = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.log(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data || '', entry.error || '');
        break;
    }
  }

  // 公開メソッド
  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data, error);
    this.emit('error', error || new Error(message), context || 'Unknown');
  }

  // 運行状況変更をログ
  logStatusChange(status: string, previousStatus: string | null): void {
    if (this.options.enableStatusHistory) {
      this.statusHistory.push({
        timestamp: new Date(),
        status,
        previousStatus
      });

      // 履歴サイズを制限
      if (this.statusHistory.length > 100) {
        this.statusHistory = this.statusHistory.slice(-100);
      }
    }

    this.info(
      `運行状況が変更されました: ${previousStatus || '不明'} → ${status}`,
      'StatusChange',
      { status, previousStatus }
    );

    this.emit('statusChange', status, previousStatus);
  }

  // 通知送信をログ
  logNotificationSent(succeeded: number, failed: number, details?: any): void {
    const message = `通知送信完了: 成功=${succeeded}, 失敗=${failed}`;
    
    if (failed > 0) {
      this.warn(message, 'Notification', details);
    } else {
      this.info(message, 'Notification', details);
    }

    this.emit('notificationSent', succeeded, failed);
  }

  // スクレイピング完了をログ
  logScrapingComplete(status: string, duration: number, error?: Error): void {
    if (error) {
      this.error(
        `スクレイピング失敗 (${duration}ms)`,
        'Scraping',
        error,
        { status, duration }
      );
    } else {
      this.info(
        `スクレイピング完了: ${status} (${duration}ms)`,
        'Scraping',
        { status, duration }
      );
    }

    this.emit('scrapingComplete', status, duration);
  }

  // ログを取得
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let logs = this.logs;
    
    if (level !== undefined) {
      logs = logs.filter(log => log.level >= level);
    }
    
    if (limit) {
      logs = logs.slice(-limit);
    }
    
    return [...logs];
  }

  // 運行状況履歴を取得
  getStatusHistory(limit?: number): typeof this.statusHistory {
    if (limit) {
      return this.statusHistory.slice(-limit);
    }
    return [...this.statusHistory];
  }

  // ログをクリア
  clearLogs(): void {
    this.logs = [];
  }

  // 状況履歴をクリア
  clearStatusHistory(): void {
    this.statusHistory = [];
  }

  // デバッグ情報を取得
  getDebugInfo(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    recentErrors: LogEntry[];
    statusHistory: typeof this.statusHistory;
    options: LoggerOptions;
  } {
    const logsByLevel: Record<string, number> = {};
    
    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
    });

    const recentErrors = this.logs
      .filter(log => log.level === LogLevel.ERROR)
      .slice(-10);

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      recentErrors,
      statusHistory: this.getStatusHistory(20),
      options: this.options
    };
  }

  // ログレベルを変更
  setLogLevel(level: LogLevel): void {
    this.options.level = level;
    this.info(`ログレベルを ${LogLevel[level]} に変更しました`, 'Logger');
  }

  // CSVエクスポート
  exportLogsAsCSV(): string {
    const headers = ['Timestamp', 'Level', 'Message', 'Context', 'Data'];
    const rows = this.logs.map(log => [
      log.timestamp.toISOString(),
      LogLevel[log.level],
      log.message.replace(/"/g, '""'), // エスケープ
      log.context || '',
      JSON.stringify(log.data || {}).replace(/"/g, '""')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}

// シングルトンインスタンスをエクスポート
export const logger = Logger.getInstance();