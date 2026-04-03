import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva("flex items-center gap-2 capitalize text-sm", {
  variants: {
    status: {
      // Positive Statuses
      succeeded: "text-green-600",
      completed: "text-green-600",
      Active: "text-green-600",
      sent: "text-sky-600",
      '00': "text-green-600",
      'Succeeded': "text-green-600",
      
      // Neutral/In-Progress Statuses
      pending: "text-yellow-600",
      processing: "text-blue-600",
      "In Review": "text-blue-600",
      '06': "text-blue-600",
      'In Process': "text-blue-600",
      '07': "text-yellow-600",
      'To Be Paid': "text-yellow-600",


      // Negative/Attention Statuses
      failed: "text-red-600",
      Suspended: "text-orange-600",
      Rejected: "text-red-600",
      '01': "text-red-600",
      'Failed': "text-red-600",
      '08': "text-gray-600",
      'Cancelled': "text-gray-600",
       '09': "text-orange-600",
      'Expired': "text-orange-600",


      // Other Statuses
      Inactive: "text-slate-600",
      "N/A": "text-gray-600",
      default: "text-gray-600",
    },
  },
  defaultVariants: {
    status: "default",
  },
});

const statusDotVariants = cva("h-2 w-2 rounded-full", {
    variants: {
    status: {
      // Positive Statuses
      succeeded: "bg-green-500",
      completed: "bg-green-500",
      Active: "bg-green-500",
      sent: "bg-sky-500",
      '00': "bg-green-500",
      'Succeeded': "bg-green-500",
      
      // Neutral/In-Progress Statuses
      pending: "bg-yellow-500",
      processing: "bg-blue-500",
      "In Review": "bg-blue-500",
      '06': "bg-blue-500",
      'In Process': "bg-blue-500",
      '07': "bg-yellow-500",
      'To Be Paid': "bg-yellow-500",


      // Negative/Attention Statuses
      failed: "bg-red-500",
      Suspended: "bg-orange-500",
      Rejected: "bg-red-500",
      '01': "bg-red-500",
      'Failed': "bg-red-500",
      '08': "bg-gray-400",
      'Cancelled': "bg-gray-400",
       '09': "bg-orange-500",
      'Expired': "bg-orange-500",


      // Other Statuses
      Inactive: "bg-slate-400",
      "N/A": "bg-gray-400",
      default: "bg-gray-400",
    },
  },
  defaultVariants: {
    status: "default",
  },
})

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  const statusString = status || 'default';
  
  return (
    <div
      className={cn(statusBadgeVariants({ status: statusString as any }), className)}
      {...props}
    >
      <div className={cn(statusDotVariants({ status: statusString as any }))} />
      <span>{statusString.replace(/_/g, ' ')}</span>
    </div>
  );
}
