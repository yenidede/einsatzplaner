"use client";

import Image from "next/image";

export function PersonPropertySection() {
  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-2">
      <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
        <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
          Personeneigenschaften
        </div>
      </div>
      <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
        <div className="self-stretch px-4 flex flex-col justify-start items-start gap-4">
          <div className="self-stretch inline-flex justify-center items-center gap-2.5">
            <div className="flex-1 justify-start text-slate-600 text-sm font-medium font-['Inter'] leading-tight">
              Erstelle ein neues Eigenschaftsfeld, um Personen deiner
              Organisation Eigenschaften zuzuweisen. Beispielsweise kannst du
              festlegen, dass jeder Einsatz mindestens eine Person mit Schlüssel
              erfordert.
            </div>
          </div>
          <div className="self-stretch px-4 flex flex-col justify-center items-center gap-2.5">
            <Image
              src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/undraw_instant-analysis_vm8x%201.svg"
              alt="Illustration showing data analysis concept for person properties feature"
              width={245}
              height={210}
              unoptimized
            />
          </div>
        </div>
        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
          <button
            type="button"
            className="flex-1 px-4 py-5 bg-slate-50 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2 hover:bg-slate-100 transition-colors"
          >
            <div className="w-4 h-4 relative overflow-hidden">
              <div className="w-0 h-2.5 left-[8px] top-[3.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
              <div className="w-2.5 h-0 left-[3.33px] top-[8px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
            </div>
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
              Neue Eigenschaft Anlegen
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
