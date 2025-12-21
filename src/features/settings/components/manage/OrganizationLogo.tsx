"use client";

interface OrganizationLogoSectionProps {
  name: string;
  logoUrl: string;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
}

export function OrganizationLogoSection({
  name,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
}: OrganizationLogoSectionProps) {
  return (
    <div className="self-stretch px-4 flex flex-col justify-start items-start gap-2">
      <div className="inline-flex justify-start items-center gap-2">
        <div className="w-40 h-11 relative overflow-hidden flex items-center justify-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} Logo`}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`w-40 h-11 bg-slate-200 rounded-md flex items-center justify-center ${
              logoUrl ? "hidden" : ""
            }`}
          >
            <div className="text-slate-700 text-xl font-semibold">
              {name
                ? name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 3)
                : "ORG"}
            </div>
          </div>
        </div>
        <div className="inline-flex flex-col justify-center items-start">
          <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">
            {name}
          </div>
        </div>
      </div>

      <div className="inline-flex justify-start items-start gap-2">
        <label
          htmlFor="logo-upload"
          className="cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-md inline-flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span>Logo hochladen</span>
        </label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          onChange={onLogoUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={onLogoRemove}
          className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-slate-50 transition-colors"
        >
          <span className="text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
            Logo entfernen
          </span>
        </button>
      </div>
    </div>
  );
}
