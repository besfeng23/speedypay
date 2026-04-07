import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
        danger: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
        neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

const dotVariants = cva("h-1.5 w-1.5 rounded-full", {
    variants: {
      variant: {
        success: "bg-green-500",
        warning: "bg-yellow-500",
        danger: "bg-red-500",
        info: "bg-blue-500",
        neutral: "bg-gray-400",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
});

type StatusVariant = VariantProps<typeof badgeVariants>['variant'];

// Mapping from various status strings to a semantic variant
const statusToVariantMap: Record<string, StatusVariant> = {
    // Success states
    succeeded: 'success',
    completed: 'success',
    active: 'success',
    sent: 'success',
    approved: 'success',
    paid: 'success',
    low: 'success',

    // Warning/Pending states
    pending: 'warning',
    'in-review': 'warning',
    'to-be-paid': 'warning',
    unpaid: 'warning',
    restricted: 'warning',
    medium: 'warning',

    // Danger/Failed states
    failed: 'danger',
    rejected: 'danger',
    suspended: 'danger',
    expired: 'danger',
    high: 'danger',
    
    // Info/Processing states
    processing: 'info',
    'in-process': 'info',

    // Neutral states
    inactive: 'neutral',
    cancelled: 'neutral',
    'N/A': 'neutral',
    'not_started': 'neutral',
    'not-assessed': 'neutral',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    status?: string | null;
}

export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  const statusString = status || 'N/A';
  const variant = statusToVariantMap[statusString.toLowerCase().replace(/_/g, '-')] || 'neutral';
  
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      <div className={cn(dotVariants({ variant }))} />
      <span className="capitalize">{statusString.replace(/_/g, ' ')}</span>
    </div>
  );
}
