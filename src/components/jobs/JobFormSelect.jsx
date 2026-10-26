import { Children, isValidElement } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export default function JobFormSelect({ className, children, value, ...props }) {
  const savedOption = value != null && value !== "" && !Children.toArray(children).some(child => isValidElement(child) && String(child.props.value ?? child.props.children) === String(value));
  return <span className="relative block min-w-0">
    <select {...props} value={value} className={cn(className, "w-full min-w-0 appearance-none truncate pl-4 pr-12")}>
      {children}
      {savedOption && <option value={value}>{value}</option>}
    </select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
  </span>;
}
