'use client';

import { Button } from '@/components/ui/button';
import type { FieldType } from '../types';

interface FieldTypeSelectorProps {
  onSelectType: (type: FieldType) => void;
  onBack: () => void;
}

export function FieldTypeSelector({
  onSelectType,
  onBack,
}: FieldTypeSelectorProps) {
  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          Feldtyp auswählen
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
        <div className="flex flex-col items-start justify-start gap-4 self-stretch px-4">
          <div className="grid grid-cols-2 gap-4 self-stretch">
            <div
              onClick={() => onSelectType('text')}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-6 py-8 transition-all hover:border-slate-300"
            >
              <div className="text-4xl font-semibold text-slate-900">T</div>
              <div className="text-center text-base font-medium text-slate-900">
                Text
              </div>
            </div>

            <div
              onClick={() => onSelectType('number')}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-6 py-8 transition-all hover:border-slate-300"
            >
              <div className="text-4xl font-semibold text-slate-900">#</div>
              <div className="text-center text-base font-medium text-slate-900">
                Zahl
              </div>
            </div>

            <div
              onClick={() => onSelectType('boolean')}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-6 py-8 transition-all hover:border-slate-300"
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
              <div className="text-center text-base font-medium text-slate-900">
                Ja/Nein
              </div>
            </div>

            <div
              onClick={() => onSelectType('select')}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-6 py-8 transition-all hover:border-slate-300"
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
              <div className="text-center text-base font-medium text-slate-900">
                Auswahl
              </div>
              <div className="text-center text-xs text-slate-500">
                Dropdown mit Auswahlmöglichkeiten
              </div>
            </div>
          </div>
        </div>

        <div className="inline-flex items-start justify-end gap-2 self-stretch px-4 pt-2">
          <Button onClick={onBack}>Zurück</Button>
        </div>
      </div>
    </div>
  );
}
