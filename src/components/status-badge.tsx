import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("font-semibold capitalize", {
  variants: {
    status: {
      // Positive Statuses
      succeeded: "bg-green-100 text-green-800 border-transparent hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/40",
      completed: "bg-green-100 text-green-800 border-transparent hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/40",
      Active: "bg-green-100 text-green-800 border-transparent hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/40",
      sent: "bg-sky-100 text-sky-800 border-transparent hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300 dark:hover:bg-sky-900/40",
      
      // Neutral/In-Progress Statuses
      pending: "bg-yellow-100 text-yellow-800 border-transparent hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/40",
      processing: "bg-blue-100 text-blue-800 border-transparent hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/40",
      "In Review": "bg-blue-100 text-blue-800 border-transparent hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/40",

      // Negative/Attention Statuses
      failed: "bg-red-100 text-red-800 border-transparent hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/40",
      Suspended: "bg-orange-100 text-orange-800 border-transparent hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/40",
      Rejected: "bg-red-100 text-red-800 border-transparent hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/40",

      // Other Statuses
      Inactive: "bg-slate-100 text-slate-700 border-transparent hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800/50",
      "N/A": "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/50",
      default: "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/50",
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
      className={cn(statusBadgeVariants({ status: statusString as any }), className)}
      {...props}
    >
      {statusString.replace(/_/g, ' ')}
    </Badge>
  );
}
