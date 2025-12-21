"use client";

interface Role {
  id?: string;
  name?: string;
  abbreviation?: string;
}

interface User {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
}

interface UserListItemProps {
  user: User;
  roles: Role[];
  onProfileClick: () => void;
}

export function UserListItem({
  user,
  roles,
  onProfileClick,
}: UserListItemProps) {
  const getInitials = () => {
    const name =
      user.firstname && user.lastname
        ? `${user.firstname} ${user.lastname}`
        : user.email || "?";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: Role) => {
    if (role?.name === "Superadmin") return "bg-rose-400";
    if (role?.name === "Organisationsverwaltung" || role?.abbreviation === "OV")
      return "bg-red-300";
    if (role?.name === "Einsatzverwaltung" || role?.abbreviation === "EV")
      return "bg-orange-300";
    return "bg-cyan-200";
  };

  const sortedRoles = [...roles].sort((a, b) => {
    const order: Record<string, number> = {
      Helfer: 1,
      Einsatzverwaltung: 2,
      EV: 2,
      Organisationsverwaltung: 3,
      OV: 3,
      Superadmin: 4,
    };
    const aName = a?.name || "";
    const bName = b?.name || "";
    const aOrder = order[aName] || 0;
    const bOrder = order[bName] || 0;
    return bOrder - aOrder;
  });

  return (
    <div className="self-stretch px-4 inline-flex justify-between items-center">
      <div className="flex justify-start items-start gap-2">
        <div className="w-10 h-10 px-2 py-1.5 bg-slate-200 rounded-[20px] inline-flex flex-col justify-center items-center gap-2.5">
          <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
            {getInitials()}
          </div>
        </div>
        <div className="inline-flex flex-col justify-center items-start gap-0.5">
          <div className="justify-start text-slate-800 text-xl font-normal font-['Inter'] leading-7">
            {user.firstname && user.lastname
              ? `${user.firstname} ${user.lastname}`
              : user.email || "Unbekannt"}
          </div>
          <div className="inline-flex justify-start items-start gap-1">
            {sortedRoles.map((role, index) => (
              <div
                key={index}
                className={`p-1 rounded-md flex justify-center items-center gap-2.5 ${getRoleColor(
                  role
                )}`}
              >
                <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">
                  {role?.abbreviation || role?.name || "Unbekannt"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onProfileClick}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md flex justify-center items-center gap-2.5 transition-colors"
      >
        <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
          Profil anzeigen
        </div>
      </button>
    </div>
  );
}
