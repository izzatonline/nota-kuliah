import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/components/theme'

type ToasterProps = React.ComponentProps<typeof Sonner>

/** shadcn's sonner wrapper, following our own light/dark switch instead of next-themes. */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        },
      }}
      {...props}
    />
  )
}
