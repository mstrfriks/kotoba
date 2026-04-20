import { cn } from "../../lib/utils";

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}) {
  const variants = {
    primary: "bg-[#1f3d2b] text-white hover:bg-[#172f22]",
    secondary: "border border-[#d7ddd8] bg-white text-[#233128] hover:bg-[#f0f3f0]",
    ghost: "text-[#526058] hover:bg-[#eef2ee]",
  };
  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    icon: "h-9 w-9 p-0",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
