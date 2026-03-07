import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "#/lib/utils";

const buttonVariants = cva(
	"focus-visible:ring-primary/50 inline-flex shrink-0 items-center justify-center gap-2 rounded-none text-sm font-bold tracking-wider whitespace-nowrap uppercase transition-all outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
	{
		variants: {
			variant: {
				default:
					"bg-primary border-primary hover:bg-primary/90 border-2 text-black [&_svg]:text-black",
				destructive:
					"bg-destructive border-destructive hover:bg-destructive/90 border-2 text-white",
				outline:
					"border-primary text-primary hover:bg-primary border-2 bg-black hover:text-black [&_svg]:hover:text-black",
				secondary:
					"border-2 border-white bg-white text-black hover:bg-gray-200 [&_svg]:text-black",
				ghost: "text-white hover:bg-white hover:text-black",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-12 px-6 py-2",
				xs: "h-8 gap-1 px-3 text-xs",
				sm: "h-10 gap-1.5 px-4",
				lg: "h-14 px-8 text-base",
				icon: "size-12",
				"icon-sm": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button };
