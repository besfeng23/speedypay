import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    children?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
            <div className="mb-4 text-primary bg-primary/10 p-3 rounded-full">
                {icon}
            </div>
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
            {children && (
                <div className="mt-6">
                    {children}
                </div>
            )}
        </div>
    );
}
