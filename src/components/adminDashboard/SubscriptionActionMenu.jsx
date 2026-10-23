import { MoreVertical, XCircle, ArrowDownCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";

const unavailable = (action) => () => toast.info(`${action} is not connected to the backend yet.`);

export const SubscriptionActionMenu = ({
  onCancel = unavailable("Subscription cancellation"),
  onDowngrade = unavailable("Subscription downgrade"),
  onSendInvoice = unavailable("Invoice sending"),
}) => {
  const trigger = useRef(null);
  return (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button
        ref={trigger}
        type="button"
        aria-label="Subscription actions"
        className="text-gray-400 hover:text-white transition-colors p-1"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      sideOffset={6}
      avoidCollisions
      collisionPadding={8}
      sticky="always"
      className="w-56 max-w-[calc(100vw-1rem)] bg-[#2A2A2E] border-white/10 text-white"
    >
      <DropdownMenuItem onSelect={() => onCancel(trigger.current)} className="cursor-pointer text-red-500 focus:bg-white/10 focus:text-red-500">
        <XCircle className="w-4 h-4" /> Cancel Subscription
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onDowngrade(trigger.current)} className="cursor-pointer focus:bg-white/10 focus:text-white">
        <ArrowDownCircle className="w-4 h-4" /> Downgrade Subscription
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSendInvoice(trigger.current)} className="cursor-pointer focus:bg-white/10 focus:text-white">
        <Receipt className="w-4 h-4" /> Send Invoice
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  );
};

export default SubscriptionActionMenu;
