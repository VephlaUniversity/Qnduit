import { ChevronDown } from "lucide-react";

// Keep native selection and keyboard behavior; inset only the decorative arrow.
export default function TalentSelect({ className = "", children, ...props }) {
  return (
    <div className="relative min-w-0">
      <select {...props} className={`${className} block w-full appearance-none pl-4 pr-14`}>
        {children}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-400">
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>
  );
}
