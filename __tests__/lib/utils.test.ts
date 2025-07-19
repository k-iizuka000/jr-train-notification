import { parseTrainStatus, formatLastUpdated, shouldNotify } from '@/lib/utils';

describe('parseTrainStatus', () => {
  it('平常運転を正しく識別する', () => {
    const result = parseTrainStatus('平常運転');
    expect(result).toEqual({
      status: '平常運転',
      isNormal: true,
    });
  });

  it('遅延情報を正しく識別する', () => {
    const result = parseTrainStatus('遅延：大宮～上尾駅間で発生した人身事故の影響で、一部列車に遅れが出ています。');
    expect(result).toEqual({
      status: '遅延：大宮～上尾駅間で発生した人身事故の影響で、一部列車に遅れが出ています。',
      isNormal: false,
      details: '遅延：大宮～上尾駅間で発生した人身事故の影響で、一部列車に遅れが出ています。',
    });
  });

  it('運転見合わせを正しく識別する', () => {
    const result = parseTrainStatus('運転見合わせ：強風の影響により、高崎～籠原駅間で運転を見合わせています。');
    expect(result).toEqual({
      status: '運転見合わせ：強風の影響により、高崎～籠原駅間で運転を見合わせています。',
      isNormal: false,
      details: '運転見合わせ：強風の影響により、高崎～籠原駅間で運転を見合わせています。',
    });
  });

  it('前後の空白を除去する', () => {
    const result = parseTrainStatus('  平常運転  ');
    expect(result.status).toBe('平常運転');
  });
});

describe('formatLastUpdated', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01 12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('数秒前の場合', () => {
    const date = new Date('2024-01-01 11:59:30');
    expect(formatLastUpdated(date)).toBe('数秒前');
  });

  it('分単位の場合', () => {
    const date = new Date('2024-01-01 11:45:00');
    expect(formatLastUpdated(date)).toBe('15分前');
  });

  it('時間単位の場合', () => {
    const date = new Date('2024-01-01 09:00:00');
    expect(formatLastUpdated(date)).toBe('3時間前');
  });

  it('1日以上前の場合', () => {
    const date = new Date('2023-12-31 12:00:00');
    const result = formatLastUpdated(date);
    expect(result).toContain('12/31');
  });
});

describe('shouldNotify', () => {
  it('初回起動時（前回の状態がない）は通知しない', () => {
    expect(shouldNotify(null, '遅延')).toBe(false);
  });

  it('平常運転から遅延に変わった場合は通知する', () => {
    expect(shouldNotify('平常運転', '遅延：10分程度の遅れ')).toBe(true);
  });

  it('遅延から平常運転に戻った場合は通知する', () => {
    expect(shouldNotify('遅延：10分程度の遅れ', '平常運転')).toBe(true);
  });

  it('平常運転のまま変化がない場合は通知しない', () => {
    expect(shouldNotify('平常運転', '平常運転')).toBe(false);
  });

  it('遅延の内容が変わっても通知しない', () => {
    expect(shouldNotify(
      '遅延：10分程度の遅れ',
      '遅延：15分程度の遅れ'
    )).toBe(false);
  });
});