type BadgeVariant = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple' | 'dark';

const COLOR_MAP: Record<string, BadgeVariant> = {
  // Operational statuses
  Draft:          'gray',
  Waiting_Match:  'yellow',
  Partial_Match:  'yellow',
  Matched:        'green',
  Cancelled:      'red',
  // Accounting statuses
  Pending_Approval: 'gray',
  Approved:         'blue',
  Queued_For_MASAV: 'purple',
  Paid:             'green',
  Closed:           'dark',
  // Entity statuses
  Active:   'green',
  Inactive: 'gray',
  // Financial event types
  Charge:       'red',
  Credit:       'green',
  Bounce_Check: 'red',
  Adjustment:   'yellow',
  Debt_Close:   'dark',
  MASAV:        'blue',
  Offset:       'purple',
  // Payment methods
  Bank_Transfer: 'blue',
  Check:         'gray',
  Credit_Card:   'blue',
  Other:         'gray',
  // Payment types
  Salary_Slip: 'dark',
  // Payment terms
  Immediate:   'green',
  Current:     'gray',
};

interface StatusBadgeProps {
  value: string;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const variant: BadgeVariant = COLOR_MAP[value] ?? 'gray';
  const label = value.replace(/_/g, ' ');
  return <span className={`badge badge-${variant}`}>{label}</span>;
}
