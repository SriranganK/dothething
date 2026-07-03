import * as React from "react"
import { AlertOctagon, ChevronsUp, ChevronUp, Equal, ChevronDown, ChevronsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ItemPriorityClass } from "@/types/workspace"

export interface PriorityIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  priority: ItemPriorityClass
  showText?: boolean
  iconClassName?: string
}

export function PriorityIndicator({
  priority,
  showText = true,
  iconClassName,
  className,
  ...props
}: PriorityIndicatorProps) {
  let Icon = Equal;
  let colorClass = "text-amber-500";
  let bgClass = "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";

  switch (priority) {
    case "Critical":
      Icon = AlertOctagon;
      colorClass = "text-red-600 dark:text-red-400 font-bold";
      bgClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
      break;
    case "Highest":
      Icon = ChevronsUp;
      colorClass = "text-red-500 dark:text-red-450";
      bgClass = "bg-red-50 text-red-700 border-red-100 hover:bg-red-100/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
      break;
    case "High":
      Icon = ChevronUp;
      colorClass = "text-orange-500 dark:text-orange-400";
      bgClass = "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100/50 dark:bg-orange-950/20 dark:text-orange-450 dark:border-orange-900/30";
      break;
    case "Medium":
      Icon = Equal;
      colorClass = "text-amber-500 dark:text-amber-400";
      bgClass = "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      break;
    case "Low":
      Icon = ChevronDown;
      colorClass = "text-blue-500 dark:text-blue-400";
      bgClass = "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30";
      break;
    case "Lowest":
      Icon = ChevronsDown;
      colorClass = "text-slate-450 dark:text-slate-400";
      bgClass = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:text-slate-350 dark:border-slate-800";
      break;
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
      {showText && <span>{priority}</span>}
    </div>
  )
}
