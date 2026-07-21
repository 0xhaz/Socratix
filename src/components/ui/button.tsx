import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-normal uppercase tracking-[0.15em] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Bugatti signature CTA: transparent fill, 1px white outline pill.
        default:
          "border border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        destructive:
          "border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-destructive/20",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-accent",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-link normal-case tracking-normal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-8 py-2 has-[>svg]:px-6",
        sm: "h-9 gap-1.5 px-5 has-[>svg]:px-4",
        lg: "h-12 px-10 has-[>svg]:px-6",
        icon: "size-10 tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
