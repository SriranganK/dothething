import * as React from "react"
import { Circle, CircleDot, Clock, CheckCircle2, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string
  showText?: boolean
  iconClassName?: string
}

export function StatusIndicator({
  status,
  showText = true,
  iconClassName,
  className,
  ...props
}: StatusIndicatorProps) {
  const lower = status.toLowerCase();

  let Icon = Circle;
  let colorClass = "text-zinc-500";
  let bgClass = "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100/50";

  if (lower.includes("done") || lower.includes("complete") || lower.includes("resolved") || lower.includes("closed")) {
    Icon = CheckCircle2;
    colorClass = "text-emerald-600 dark:text-emerald-450";
    bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
  } else if (
    lower.includes("progress") ||
    lower.includes("doing") ||
    lower.includes("review") ||
    lower.includes("testing") ||
    lower.includes("active")
  ) {
    Icon = Clock;
    colorClass = "text-blue-600 dark:text-blue-400";
    bgClass = "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
  } else if (
    lower.includes("todo") ||
    lower.includes("to do") ||
    lower.includes("backlog") ||
    lower.includes("new") ||
    lower.includes("open")
  ) {
    Icon = CircleDot;
    colorClass = "text-zinc-500 dark:text-zinc-400";
    bgClass = "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100/50 dark:bg-zinc-900/40 dark:text-zinc-300 dark:border-zinc-800";
  } else {
    Icon = HelpCircle;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold transition-colors shrink-0 select-none",
        bgClass,
        className
      )}
      {...props}
    >
      <Icon className={cn("size-3.5 shrink-0", colorClass, iconClassName)} />
      {showText && <span>{status}</span>}
    </div>
  )
}
