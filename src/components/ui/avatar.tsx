import { cn, getInitials } from '@/lib/utils';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={80}
          height={80}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center',
            sizeClasses[size]
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            online ? 'bg-green-500' : 'bg-slate-300',
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  );
}
