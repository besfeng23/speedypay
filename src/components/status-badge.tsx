import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("font-semibold", {
  variants: {
    status: {
      // Payment & General Status
      succeeded: "bg-green-100 text-green-800 border-transparent dark:bg-green-900/50 dark:text-green-300",
      completed: "bg-green-100 text-green-800 border-transparent dark:bg-green-900/50 dark:text-green-300",
      Active: "bg-green-100 text-green-800 border-transparent dark:bg-green-900/50 dark:text-green-300",
      sent: "bg-sky-100 text-sky-800 border-transparent dark:bg-sky-900/50 dark:text-sky-300",
      
      pending: "bg-yellow-100 text-yellow-800 border-transparent dark:bg-yellow-900/50 dark:text-yellow-300",
      processing: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300",
      "In Review": "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-900/50 dark:text-blue-300",

      failed: "bg-red-100 text-red-800 border-transparent dark:bg-red-900/50 dark:text-red-300",
      Suspended: "bg-orange-100 text-orange-800 border-transparent dark:bg-orange-900/50 dark:text-orange-300",
      Rejected: "bg-red-100 text-red-800 border-transparent dark:bg-red-900/50 dark:text-red-300",

      // Neutral states
      Inactive: "bg-slate-100 text-slate-700 border-transparent dark:bg-slate-800 dark:text-slate-300",
      "N/A": "bg-gray-100 text-gray-700 border-transparent dark:bg-gray-800 dark:text-gray-300",
      default: "bg-gray-100 text-gray-700 border-transparent dark:bg-gray-800 dark:text-gray-300",
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
