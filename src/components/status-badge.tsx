import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("font-semibold", {
  variants: {
    status: {
      // Positive Statuses
      succeeded: "bg-green-100 text-green-900 border-transparent dark:bg-green-800/20 dark:text-green-300",
      completed: "bg-green-100 text-green-900 border-transparent dark:bg-green-800/20 dark:text-green-300",
      Active: "bg-green-100 text-green-900 border-transparent dark:bg-green-800/20 dark:text-green-300",
      sent: "bg-sky-100 text-sky-900 border-transparent dark:bg-sky-800/20 dark:text-sky-300",
      
      // Neutral/In-Progress Statuses
      pending: "bg-yellow-100 text-yellow-900 border-transparent dark:bg-yellow-800/20 dark:text-yellow-300",
      processing: "bg-blue-100 text-blue-900 border-transparent dark:bg-blue-800/20 dark:text-blue-300",
      "In Review": "bg-blue-100 text-blue-900 border-transparent dark:bg-blue-800/20 dark:text-blue-300",

      // Negative/Attention Statuses
      failed: "bg-red-100 text-red-900 border-transparent dark:bg-red-800/20 dark:text-red-300",
      Suspended: "bg-orange-100 text-orange-900 border-transparent dark:bg-orange-800/20 dark:text-orange-300",
      Rejected: "bg-red-100 text-red-900 border-transparent dark:bg-red-800/20 dark:text-red-300",

      // Other Statuses
      Inactive: "bg-slate-100 text-slate-800 border-transparent dark:bg-slate-800/50 dark:text-slate-300",
      "N/A": "bg-gray-100 text-gray-800 border-transparent dark:bg-gray-800/50 dark:text-gray-300",
      default: "bg-gray-100 text-gray-800 border-transparent dark:bg-gray-800/50 dark:text-gray-300",
    },
  },
  defaultVariants: {
    status: "default",
  },
});

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  const statusString = status || 'default';
  
  return (
    <Badge
      className={cn("capitalize", statusBadgeVariants({ status: statusString as any }), className)}
      {...props}
    >
      {statusString.replace(/_/g, ' ')}
    </Badge>
  );
}
