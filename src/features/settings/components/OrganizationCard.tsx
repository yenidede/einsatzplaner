import React from "react";

interface OrganizationRoleBadgeProps {
  role: string;
}

export const OrganizationRoleBadge: React.FC<OrganizationRoleBadgeProps> = ({ role }) => {
  let bg = "bg-slate-200";
  if (role === "Superadmin") bg = "bg-rose-400";
  else if (role === "OV") bg = "bg-red-300";
  else if (role === "EV") bg = "bg-orange-300";
  else if (role === "Helfer:in") bg = "bg-cyan-200";

  return (
    <div className={`p-1 ${bg} rounded-md flex justify-center items-center gap-2.5`}>
      <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">{role}</div>
    </div>
  );
};

interface OrganizationCardProps {
  name: string;
  roles: string[];
  logo?: React.ReactNode;
  onLeave?: () => void;
}

export const OrganizationCard: React.FC<OrganizationCardProps> = ({ name, roles, logo, onLeave }) => (
<div className="self-stretch px-4 py-6 inline-flex flex-col justify-start items-start gap-4">
    <div className="inline-flex justify-start items-center gap-4">
    {logo }
        <div className="inline-flex flex-col justify-center items-start gap-0.5">
            <div className="justify-start text-slate-800 text-xl font-normal font-['Inter'] leading-7">{name}</div>
            <div className="inline-flex justify-start items-start gap-1">
        {roles && roles.length > 0 ? (
          roles.map((role, idx) => <OrganizationRoleBadge key={idx} role={role} />)
        ) : (
          <OrganizationRoleBadge role="Keine Rolle" />
        )}
            </div>
        </div>
    </div>
    <div className="self-stretch flex flex-col justify-start items-end gap-2.5">
        <div data-state="Default" data-type="with icon" className="px-4 py-2 bg-red-500 rounded-md inline-flex justify-center items-center gap-2">
            <div className="w-4 h-4 relative overflow-hidden"
                    onClick={onLeave}>
                <div className="w-3 h-0 left-[2px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                <div className="w-2.5 h-2.5 left-[3.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                <div className="w-1.5 h-[2.67px] left-[5.33px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
            </div>
            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Organisation verlassen</div>
        </div>
    </div>
</div>
);


export default OrganizationCard;
