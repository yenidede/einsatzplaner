'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { EinsatzFormData, CustomFieldDefinition, EinsatzSystemStatus } from '@/features/einsatz/types/einsatz';
import { useEinsatz, useAutosave } from '@/features/einsatz/hooks/useEinsatz';
import { checkHelferWarning } from '@/utils/einsatzClientUtils';
import { exampleTemplates, EinsatzTemplate } from '@/features/einsatztemplate/types/einsatzTemplate';

interface EinsatzFormProps {
  einsatzId?: string;
  onSuccess?: (einsatz: any) => void;
  onCancel?: () => void;
}

export default function EinsatzForm({ einsatzId, onSuccess, onCancel }: EinsatzFormProps) {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  // Für neue eigene Felder: Laufende ID
  const [customFieldCounter, setCustomFieldCounter] = useState(1);
  const [helferWarning, setHelferWarning] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EinsatzTemplate | null>(null);
  const { createEinsatz, updateEinsatz } = useEinsatz();
  const { saveAutosave, getAutosave, clearAutosave } = useAutosave();

  const { 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    formState: { errors, isDirty },
    reset
  } = useForm<EinsatzFormData>({
    defaultValues: {
      name: '',
      kategorie: '',
      datum: new Date(),
      uhrzeitVon: '09:00',
      uhrzeitBis: '17:00',
      anzahlTeilnehmer: 1,
      einzelpreis: 0,
      anzahlHelfer: 2,
      helfer: [],
      customFields: [],
      systemStatus: EinsatzSystemStatus.ENTWURF
    }
  });

  // Template-Auswahl: Felder übernehmen
  const handleTemplateChange = (templateId: string) => {
    const found = exampleTemplates.find(t => t._id === templateId);
    setSelectedTemplate(found || null);
    if (found) {
      // Setze Standardwerte für Felder, falls vorhanden
      const defaults: any = {};
      found.fields.forEach(f => {
        if (f.defaultValue !== undefined) {
          defaults[f.name] = f.defaultValue;
        }
      });
      reset({
        ...defaults,
        systemStatus: EinsatzSystemStatus.ENTWURF
      });
      // CustomFields für dynamische Felder
      setCustomFields(found.fields.filter(f => !['name','kategorie','datum','uhrzeitVon','uhrzeitBis','anzahlTeilnehmer','einzelpreis','gesamtpreis'].includes(f.name)) as any);
    }
  };

  const watchedValues = watch();

  // Autosave-Funktionalität
  useEffect(() => {
    if (isDirty) {
      const timeoutId = setTimeout(async () => {
        try {
          await saveAutosave(einsatzId, watchedValues);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [watchedValues, isDirty, einsatzId, saveAutosave]);

  // Helfer-Warnung überwachen
  useEffect(() => {
    const anzahlHelfer = watchedValues.anzahlHelfer || 0;
    setHelferWarning(checkHelferWarning(anzahlHelfer));
  }, [watchedValues.anzahlHelfer]);

  // Lade Autosave-Daten beim Initialisieren
  useEffect(() => {
    const loadAutosave = async () => {
      try {
        const autosaveData = await getAutosave(einsatzId);
        if (autosaveData && autosaveData.formData) {
          reset(autosaveData.formData as EinsatzFormData);
          setLastSaved(new Date(autosaveData.lastSaved));
        }
      } catch (error) {
        console.error('Failed to load autosave:', error);
      }
    };

    loadAutosave();
  }, [einsatzId, getAutosave, reset]);

  // Lade Custom Fields
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const response = await fetch('/api/custom-fields');
        if (response.ok) {
          const fields = await response.json();
          setCustomFields(fields);
        }
      } catch (error) {
        console.error('Failed to load custom fields:', error);
      }
    };

    loadCustomFields();
  }, []);

  const onSubmit = async (data: EinsatzFormData) => {
    setIsSubmitting(true);
    try {
      let result;
      if (einsatzId) {
        result = await updateEinsatz(einsatzId, data);
      } else {
        result = await createEinsatz(data);
      }

      // Clear autosave after successful submission
      await clearAutosave(einsatzId);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Submit failed:', error);
      alert(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  const kategorieOptions = [
    'Freizeit (KiJu)',
    'Rüstzeuge (KiJu)',
    'Sonstiges'
  ];

  const helferOptions = [
    'Offen',
    'Max Mustermann',
    'Anna Schmidt',
    'Tom Weber'
  ];

  return (
<div className="w-[1026px] py-4 bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex flex-col justify-center items-center gap-7">
    <div className="self-stretch p-4 border-b border-slate-200 inline-flex justify-start items-start gap-8">
        <div className="flex-1 h-8 flex justify-center items-center gap-2.5">
            <div className="flex-1 justify-start text-slate-800 text-2xl font-semibold font-['Poppins'] leading-loose">Neuer Einsatz</div>
        </div>
        <div className="flex justify-end items-center gap-2">
            <div data-state="Default" data-type="outline" className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Abbrechen (ESC)</div>
            </div>
            <div data-state="Default" data-type="default" className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5">
                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern & Veröffentlichen</div>
            </div>
        </div>
    </div>
    <div className="self-stretch flex flex-col justify-start items-start gap-8">
        <div className="self-stretch flex flex-col justify-center items-start gap-4">
            <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start"><span className="text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Name</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                    <div className="self-stretch inline-flex justify-start items-start gap-2">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">Einsatzname</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start"><span className="text-black text-sm font-medium font-['Inter'] leading-tight">Kategorie</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                    <div data-padding-left="true" className="self-stretch px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-center gap-2.5">
                        <div className="flex-1 justify-start text-slate-800 text-sm font-normal font-['Inter'] leading-normal">Friedhof (FH), Fluchtwege (FW)</div>
                        <div className="w-4 h-4 relative overflow-hidden">
                            <div className="w-2 h-1 left-[4px] top-[6px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-400" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch py-2 border-t border-slate-200 flex flex-col justify-start items-start gap-2">
                <div className="px-4 inline-flex justify-center items-center gap-2.5">
                    <div className="justify-start text-black text-sm font-semibold font-['Inter'] leading-tight">Allgemein</div>
                </div>
                <div className="self-stretch flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Datum</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">5.7.2025</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Uhrzeit von</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">9:00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Uhrzeit bis</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">10:00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Anzahl Teilnehmer</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">20</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Einzelpreis</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">12,00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch py-2 border-t border-slate-200 flex flex-col justify-start items-start gap-2">
                <div className="px-4 inline-flex justify-center items-center gap-2.5">
                    <div className="justify-start text-black text-sm font-semibold font-['Inter'] leading-tight">Helfer</div>
                </div>
                <div className="self-stretch flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Anzahl Helfer</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">2</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-black text-sm font-medium font-['Inter'] leading-tight">Helfer 1</div>
                            <div data-padding-left="true" className="self-stretch px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-center gap-2.5">
                                <div className="flex-1 justify-start text-slate-800 text-sm font-normal font-['Inter'] leading-normal">Offen</div>
                                <div className="w-4 h-4 relative overflow-hidden">
                                    <div className="w-2 h-1 left-[4px] top-[6px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-black text-sm font-medium font-['Inter'] leading-tight">Helfer 2</div>
                            <div data-padding-left="true" className="self-stretch px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-center gap-2.5">
                                <div className="flex-1 justify-start text-slate-800 text-sm font-normal font-['Inter'] leading-normal">Offen</div>
                                <div className="w-4 h-4 relative overflow-hidden">
                                    <div className="w-2 h-1 left-[4px] top-[6px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                    <div className="justify-start text-black text-sm font-semibold font-['Inter'] leading-tight">Eigene Felder</div>
                </div>
                <div className="self-stretch py-2 border-t border-slate-200 flex flex-col justify-start items-start gap-2">
                    <div className="px-4 inline-flex justify-center items-center gap-2.5">
                        <div className="justify-start text-black text-sm font-semibold font-['Inter'] leading-tight">Gruppe</div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-black text-sm font-medium font-['Inter'] leading-tight">Kategorie</span><span className="text-red-600 text-sm font-medium font-['Inter'] leading-tight">*</span></div>
                            <div data-padding-left="true" className="self-stretch px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-center gap-2.5">
                                <div className="flex-1 justify-start text-slate-800 text-sm font-normal font-['Inter'] leading-normal">Select an option</div>
                                <div className="w-4 h-4 relative overflow-hidden">
                                    <div className="w-2 h-1 left-[4px] top-[6px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Schulstufe</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">3</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="self-stretch py-2 border-t border-slate-200 flex flex-col justify-start items-start gap-2">
                    <div className="px-4 inline-flex justify-center items-center gap-2.5">
                        <div className="justify-start text-black text-sm font-semibold font-['Inter'] leading-tight">Kontakt</div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4 flex-wrap content-start">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Name</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">Max Mustermann</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Telefon</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">+43 123 4567890</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Email</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <div className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 inline-flex justify-start items-center">
                                        <div className="justify-start text-slate-400 text-base font-normal font-['Inter'] leading-normal">max.mustermann@gmail.com</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="self-stretch py-2 border-t border-slate-200 flex flex-col justify-start items-start gap-2">
                    <div className="px-4 inline-flex justify-center items-center gap-2.5">
                        <div className="justify-start text-black text-sm font-semibold font-['Inter'] leading-tight">Sonstiges</div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4 flex-wrap content-start">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-black text-sm font-medium font-['Inter'] leading-tight">Anreise</div>
                            <div data-padding-left="true" className="self-stretch px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-center gap-2.5">
                                <div className="flex-1 justify-start text-slate-800 text-sm font-normal font-['Inter'] leading-normal">Select an option</div>
                                <div className="w-4 h-4 relative overflow-hidden">
                                    <div className="w-2 h-1 left-[4px] top-[6px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 h-16 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-black text-sm font-medium font-['Inter'] leading-tight">Fördergemeinschaft</div>
                            <div data-state="off" className="flex-1 inline-flex justify-start items-center gap-2">
                                <div className="w-11 h-6 bg-slate-200 rounded-[50px]" />
                                <div className="w-5 h-5 bg-white rounded-full" />
                                <div className="justify-start text-black text-sm font-medium font-['Inter'] leading-none"> </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[700px] inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                                <div className="w-28 justify-start text-black text-sm font-medium font-['Inter'] leading-none">Anmerkung</div>
                                <div className="w-[994px] h-20 px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-start gap-2.5">
                                    <div className="flex-1 justify-start text-slate-400 text-sm font-normal font-['Inter'] leading-tight">Text hier eingeben ...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch px-4 flex flex-col justify-start items-start gap-2.5">
                <div data-state="Default" data-type="with icon" className="self-stretch px-4 py-5 bg-slate-50 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2">
                    <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-0 h-2.5 left-[8px] top-[3.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                        <div className="w-2.5 h-0 left-[3.33px] top-[8px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                    </div>
                    <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">eigenes Feld hinzufügen</div>
                </div>
            </div>
        </div>
    </div>
    <div className="self-stretch px-4 pt-3.5 inline-flex justify-end items-center gap-4">
        <div data-state="Default" data-type="outline" className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Abbrechen (ESC)</div>
        </div>
        <div data-state="Default" data-type="default" className="px-4 py-2 bg-slate-900 rounded-md flex justify-center items-center gap-2.5">
            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern & Veröffentlichen</div>
        </div>
    </div>
</div>
  );
}
