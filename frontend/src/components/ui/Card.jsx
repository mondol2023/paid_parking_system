import { cn } from '@/lib/cn';

export function Card({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={cn('rounded-xl border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('flex items-start justify-between gap-3 border-b border-line p-4', className)}>{children}</div>;
}

export function CardBody({ className, children }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn('flex items-center gap-2 border-t border-line p-4', className)}>{children}</div>;
}
