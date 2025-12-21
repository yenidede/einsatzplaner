"use client";

import { Button } from "@/components/SimpleFormComponents";
import type { FieldType } from "../types";

interface FieldTypeSelectorProps {
  onSelectType: (type: FieldType) => void;
  onBack: () => void;
}

export function FieldTypeSelector({
  onSelectType,
  onBack,
}: FieldTypeSelectorProps) {
  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-2">
      <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
        <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
          Feldtyp auswählen
        </div>
      </div>
      <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
        <div className="self-stretch px-4 flex flex-col justify-start items-start gap-4">
          <div className="self-stretch grid grid-cols-2 gap-4">
            <div
              onClick={() => onSelectType("text")}
              className="px-6 py-8 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-slate-50 flex flex-col justify-center items-center gap-3 cursor-pointer transition-all"
            >
              <div className="text-4xl font-semibold text-slate-900">T</div>
              <div className="text-slate-900 text-base font-medium text-center">
                Text
              </div>
            </div>

            <div
              onClick={() => onSelectType("number")}
              className="px-6 py-8 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-slate-50 flex flex-col justify-center items-center gap-3 cursor-pointer transition-all"
            >
              <div className="text-4xl font-semibold text-slate-900">#</div>
              <div className="text-slate-900 text-base font-medium text-center">
                Zahl
              </div>
            </div>

            <div
              onClick={() => onSelectType("boolean")}
              className="px-6 py-8 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-slate-50 flex flex-col justify-center items-center gap-3 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-slate-900"
                >
                  <rect
                    x="5"
                    y="9"
                    width="14"
                    height="6"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="15" cy="12" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="text-slate-900 text-base font-medium text-center">
                Ja/Nein
              </div>
            </div>

            <div
              onClick={() => onSelectType("select")}
              className="px-6 py-8 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-slate-50 flex flex-col justify-center items-center gap-3 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-slate-900"
                >
                  <rect
                    x="4"
                    y="6"
                    width="16"
                    height="3"
                    rx="1.5"
                    fill="currentColor"
                  />
                  <rect
                    x="4"
                    y="11"
                    width="16"
                    height="3"
                    rx="1.5"
                    fill="currentColor"
                  />
                  <rect
                    x="4"
                    y="16"
                    width="16"
                    height="3"
                    rx="1.5"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="text-slate-900 text-base font-medium text-center">
                Auswahl
              </div>
              <div className="text-slate-500 text-xs text-center">
                Dropdown mit Auswahlmöglichkeiten
              </div>
            </div>
          </div>
        </div>

        <div className="self-stretch px-4 pt-2 inline-flex justify-end items-start gap-2">
          <Button
            onClick={onBack}
            className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
          >
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
              Zurück
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
