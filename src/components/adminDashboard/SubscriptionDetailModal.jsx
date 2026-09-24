import React from "react";
import {
  Calendar,
  Mail,
  Circle,
  CreditCard,
  Layers,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { Modal } from "./Modal";

const Field = (props) => {
  const Icon = props.icon;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {props.label}
        </div>
        <div className="text-white font-medium">{props.value}</div>
      </div>
    </div>
  );
};

// extraLabel/extraValue lets the same modal serve both employers
// (Organization Type) and candidates (Job Role) without duplicating markup.
export const SubscriptionDetailModal = (props) => {
  const { subject, avatarIcon, avatarSrc, onClose } = props;
  const AvatarIcon = avatarIcon;
  return (
  <Modal open={!!subject} onClose={onClose} maxWidth="max-w-2xl">
    {subject && (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <AvatarIcon className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-white">
              {subject.name}
            </h2>
            <p className="text-gray-400 text-sm">{subject.plan}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-6">
          <Field icon={Calendar} label="Start Date:" value={subject.startDate} />
          <Field icon={Calendar} label="End Date:" value={subject.endDate} />
          <Field icon={Mail} label="Email" value={subject.email} />
          <Field icon={Circle} label="Status" value={subject.status} />
          <Field
            icon={CreditCard}
            label="Payment Method"
            value={subject.paymentMethod}
          />
          <Field icon={Layers} label="Category" value={subject.category} />
          <Field
            icon={Calendar}
            label="Last Payment:"
            value={subject.lastPayment}
          />
          <Field icon={DollarSign} label="Amount" value={subject.amount} />
          <Field
            icon={subject.extraIcon || Briefcase}
            label={subject.extraLabel}
            value={subject.extraValue}
          />
        </div>
      </div>
    )}
  </Modal>
  );
};

export default SubscriptionDetailModal;
