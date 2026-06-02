import { AccountingStatus, OperationalStatus } from '../types/enums';

export const NEXT_OPERATIONAL: Readonly<Record<OperationalStatus, readonly OperationalStatus[]>> = {
  [OperationalStatus.Draft]:        [OperationalStatus.WaitingMatch, OperationalStatus.Cancelled],
  [OperationalStatus.WaitingMatch]: [OperationalStatus.PartialMatch, OperationalStatus.Matched, OperationalStatus.Cancelled],
  [OperationalStatus.PartialMatch]: [OperationalStatus.Matched, OperationalStatus.Cancelled],
  [OperationalStatus.Matched]:      [],
  [OperationalStatus.Cancelled]:    [],
};

export const NEXT_ACCOUNTING: Readonly<Record<AccountingStatus, readonly AccountingStatus[]>> = {
  [AccountingStatus.PendingApproval]: [AccountingStatus.Approved],
  [AccountingStatus.Approved]:        [AccountingStatus.QueuedForMASAV],
  [AccountingStatus.QueuedForMASAV]:  [AccountingStatus.Paid],
  [AccountingStatus.Paid]:            [AccountingStatus.Closed],
  [AccountingStatus.Closed]:          [],
};

export const STATUS_LABELS: Readonly<Record<string, string>> = {
  [OperationalStatus.Draft]:              'טיוטה',
  [OperationalStatus.WaitingMatch]:       'ממתין להתאמה',
  [OperationalStatus.PartialMatch]:       'התאמה חלקית',
  [OperationalStatus.Matched]:            'מותאם',
  [OperationalStatus.Cancelled]:          'מבוטל',
  [AccountingStatus.PendingApproval]:     'ממתין לאישור',
  [AccountingStatus.Approved]:            'מאושר',
  [AccountingStatus.QueuedForMASAV]:      'בתור מסב',
  [AccountingStatus.Paid]:                'שולם',
  [AccountingStatus.Closed]:              'סגור',
};
