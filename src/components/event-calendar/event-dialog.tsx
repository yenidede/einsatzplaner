"use client";

import { useEffect, useMemo, useState } from "react";
import { RiCalendarLine, RiDeleteBinLine } from "@remixicon/react";
import { format, isBefore } from "date-fns";
import { de } from "date-fns/locale"; // Add German locale import

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent, EventColor } from "@/components/event-calendar";
import {
  DefaultEndHour,
  DefaultStartHour,
  EndHour,
  StartHour,
} from "@/components/event-calendar/constants";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import type {
  einsatz as Einsatz,
  organization as Organization,
  einsatz_field as EinsatzField,
  einsatz_status as EinsatzStatus,
  einsatz_template as EinsatzTemplate,
  einsatz_category as EinsatzCategory,
} from "@/generated/prisma";
import { useQuery } from "@tanstack/react-query";
import { EinsatzCreate, EinsatzDetailed } from "@/features/einsatz/types";
import FormGroup from "../form/formGroup";
import FormField from "../form/formInputField";
import { MultiSelect } from "../form/multi-select";
import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import MultiSelectFormField from "../form/multiSelectFormField";
import FormInputFieldCustom from "../form/formInputFieldCustom";
import ToggleItemBig from "../form/toggle-item-big";
import { getAllTemplatesWithIconByOrgId } from "@/features/template/template-dal";

interface EventDialogProps {
  einsatz: EinsatzCreate | string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (einsatz: Einsatz) => void;
  onDelete: (eventId: string) => void;
  activeOrg: Organization | null;
}

export function EventDialog({
  einsatz,
  isOpen,
  activeOrg,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  // TODO
  const activeOrgId = "0c39989e-07bc-4074-92bc-aa274e5f22d0"; // remove this!!!
  // TODO
  const [activeTemplate, setActiveTemplate] = useState<EinsatzTemplate | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [einsatzCategoriesIds, setEinsatzCategoriesIds] = useState<string[]>(
    []
  );
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState(`${DefaultStartHour}:00`);
  const [endTime, setEndTime] = useState(`${DefaultEndHour}:00`);
  const [all_day, setAllDay] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [pricePerPerson, setPricePerPerson] = useState<number>(0);
  const [helpersNeeded, setHelpersNeeded] = useState<number>(-1);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<EinsatzField[]>([]);

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch detailed einsatz data when einsatz is a string (ID)
  const {
    data: detailedEinsatz,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["einsatz", einsatz],
    queryFn: () => {
      console.log("Query function called with einsatz:", einsatz);
      return getEinsatzWithDetailsById(einsatz as string);
    },
    enabled: typeof einsatz === "string" && !!einsatz && isOpen,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", activeOrg?.id ?? activeOrgId],
    queryFn: () => getCategoriesByOrgIds([activeOrg?.id ?? activeOrgId]),
    enabled: isOpen,
  });

  const templatesQuery = useQuery({
    queryKey: ["templates", activeOrg?.id ?? activeOrgId],
    queryFn: () => getAllTemplatesWithIconByOrgId(activeOrg?.id ?? activeOrgId),
    enabled: isOpen,
  });

  // type string means einsatz (enter exit mode)
  const currentEinsatz =
    typeof einsatz === "string" ? detailedEinsatz : einsatz;

  useEffect(() => {
    if (currentEinsatz && typeof currentEinsatz === "object") {
      // Create new (EinsatzCreate)
      if (!currentEinsatz.id) {
        const createEinsatz = currentEinsatz as EinsatzCreate;
        setTitle(createEinsatz.title || "");

        // Safely handle start and end dates
        if (createEinsatz.start) {
          const start = new Date(createEinsatz.start);
          setStartDate(start);
          setStartTime(formatTimeForInput(start));
        }

        if (createEinsatz.end) {
          const end = new Date(createEinsatz.end);
          setEndDate(end);
          setEndTime(formatTimeForInput(end));
        }

        setAllDay(createEinsatz.all_day || false);
        setError(null); // Reset error when opening dialog
      } else {
        // Edit existing einsatz (loaded from query)
        console.log("Handling existing einsatz edit");
        setTitle(currentEinsatz.title || "");

        // Safely handle start and end dates
        if (currentEinsatz.start) {
          const start = new Date(currentEinsatz.start);
          setStartDate(start);
          setStartTime(formatTimeForInput(start));
        }

        if (currentEinsatz.end) {
          const end = new Date(currentEinsatz.end);
          setEndDate(end);
          setEndTime(formatTimeForInput(end));
        }

        setAllDay(currentEinsatz.all_day || false);
        setError(null); // Reset error when opening dialog
      }
    } else {
      console.log("No currentEinsatz, resetting form");
      resetForm();
    }
  }, [currentEinsatz]);

  const resetForm = () => {
    setTitle("");
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime(`${DefaultStartHour}:00`);
    setEndTime(`${DefaultEndHour}:00`);
    setAllDay(false);
    setError(null);
  };

  const formatTimeForInput = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Memoize time options so they're only calculated once
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = StartHour; hour <= EndHour - 1; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const value = `${formattedHour}:${formattedMinute}`;
        // Use German 24-hour format (HH:mm)
        const label = `${formattedHour}:${formattedMinute}`;
        options.push({ value, label });
      }
    }
    return options;
  }, []); // Empty dependency array ensures this only runs once

  const handleSave = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!all_day) {
      const [startHours = 0, startMinutes = 0] = startTime
        .split(":")
        .map(Number);
      const [endHours = 0, endMinutes = 0] = endTime.split(":").map(Number);

      if (
        startHours < StartHour ||
        startHours > EndHour ||
        endHours < StartHour ||
        endHours > EndHour
      ) {
        setError(
          `Selected time must be between ${StartHour}:00 and ${EndHour}:00`
        );
        return;
      }

      start.setHours(startHours, startMinutes, 0);
      end.setHours(endHours, endMinutes, 0);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    // Validate that end date is not before start date
    if (isBefore(end, start)) {
      setError("End date cannot be before start date");
      return;
    }

    // Use generic title if empty
    const eventTitle = title.trim() ? title : "(no title)";

    const createdAt =
      currentEinsatz && "created_at" in currentEinsatz
        ? currentEinsatz.created_at
        : new Date();
    const updatedAt =
      currentEinsatz && "updated_at" in currentEinsatz
        ? currentEinsatz.updated_at
        : null;

    onSave({
      id: currentEinsatz?.id || "",
      title: eventTitle,
      created_at: createdAt,
      updated_at: updatedAt,
      start: start,
      end: end,
      all_day,
      participant_count: currentEinsatz?.participant_count ?? null,
      price_per_person: currentEinsatz?.price_per_person ?? null,
      total_price: currentEinsatz?.total_price ?? null,
      org_id: currentEinsatz?.org_id ?? "",
      status_id: currentEinsatz?.status_id ?? "",
      created_by: currentEinsatz?.created_by ?? "",
      template_id: currentEinsatz?.template_id ?? null,
      helpers_needed: currentEinsatz?.helpers_needed ?? -1,
    });
  };

  const handleDelete = () => {
    if (currentEinsatz?.id) {
      onDelete(currentEinsatz.id);
    }
  };

  const setDefaultFormValues = (data: {
    template?: EinsatzTemplate;
    title?: string;
    categories?: EinsatzCategory[];
    start?: Date;
    end?: Date;
    all_day?: boolean;
    participant_count?: number | null;
    price_per_person?: number | null;
    helpers_needed?: number;
    assignedUsers?: string[];
    customFields?: EinsatzField[];
  }) => {
    if (data.template) {
      setActiveTemplate(data.template);
    }
    if (data.title) {
      setTitle(data.title);
    }
    if (data.categories) {
      setEinsatzCategoriesIds(data.categories.map((cat) => cat.value));
    }
    if (data.start) {
      setStartDate(data.start);
      setStartTime(formatTimeForInput(data.start));
    }
    if (data.end) {
      setEndDate(data.end);
      setEndTime(formatTimeForInput(data.end));
    }
    if (data.all_day !== undefined) {
      setAllDay(data.all_day);
    }
    if (data.participant_count) {
      setParticipantCount(data.participant_count);
    }
    if (data.price_per_person) {
      setPricePerPerson(data.price_per_person);
    }
    if (data.helpers_needed !== undefined) {
      setHelpersNeeded(data.helpers_needed);
    }
    if (data.assignedUsers) {
      setAssignedUsers(data.assignedUsers);
    }
    if (data.customFields) {
      setCustomFields(data.customFields);
    }
  };

  // Updated color options to match types.ts
  const colorOptions: Array<{
    value: EventColor;
    label: string;
    bgClass: string;
    borderClass: string;
  }> = [
    {
      value: "sky",
      label: "Sky",
      bgClass: "bg-sky-400 data-[state=checked]:bg-sky-400",
      borderClass: "border-sky-400 data-[state=checked]:border-sky-400",
    },
    {
      value: "amber",
      label: "Amber",
      bgClass: "bg-amber-400 data-[state=checked]:bg-amber-400",
      borderClass: "border-amber-400 data-[state=checked]:border-amber-400",
    },
    {
      value: "violet",
      label: "Violet",
      bgClass: "bg-violet-400 data-[state=checked]:bg-violet-400",
      borderClass: "border-violet-400 data-[state=checked]:border-violet-400",
    },
    {
      value: "rose",
      label: "Rose",
      bgClass: "bg-rose-400 data-[state=checked]:bg-rose-400",
      borderClass: "border-rose-400 data-[state=checked]:border-rose-400",
    },
    {
      value: "emerald",
      label: "Emerald",
      bgClass: "bg-emerald-400 data-[state=checked]:bg-emerald-400",
      borderClass: "border-emerald-400 data-[state=checked]:border-emerald-400",
    },
    {
      value: "orange",
      label: "Orange",
      bgClass: "bg-orange-400 data-[state=checked]:bg-orange-400",
      borderClass: "border-orange-400 data-[state=checked]:border-orange-400",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[55rem]">
        <DialogHeader>
          <DialogTitle>
            {isLoading
              ? "Laden..."
              : currentEinsatz?.id
              ? "Bearbeite " + title
              : "Erstelle " + (activeOrg?.einsatz_name_singular ?? " Einsatz")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {currentEinsatz?.id
              ? "Edit the details of this einsatz"
              : "Add a new einsatz to your calendar"}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <div className="grid gap-8 py-4">
          <FormGroup>
            {templatesQuery.isLoading ? (
              <div>Lade Vorlagen ...</div>
            ) : !activeTemplate ? (
              // template not yet set, show options
              <FormInputFieldCustom name="Vorlage auswählen">
                <div className="flex flex-wrap gap-4 mt-1.5">
                  {templatesQuery.data?.map((t) => (
                    <ToggleItemBig
                      key={t.id}
                      text={t.name ?? "Vorlage"}
                      description={t.description ?? ""}
                      iconUrl={t.template_icon.icon_url.trim()}
                      onClick={() => {
                        setActiveTemplate(t);
                      }}
                    />
                  ))}
                </div>
              </FormInputFieldCustom>
            ) : (
              // option to switch template (TODO later)
              <div>
                <span className="font-semibold">{activeTemplate?.name}</span>{" "}
                ausgewählt.
              </div>
            )}
          </FormGroup>
          {/* possible to override the rems if categories should be larger */}
          <FormGroup className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
            <FormField
              name="Einsatz Name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <MultiSelectFormField
              name="Kategorien"
              options={
                categoriesQuery?.data
                  ? categoriesQuery?.data?.map((cat) => ({
                      value: cat.id,
                      label: cat.value,
                    }))
                  : []
              }
              defaultValue={einsatzCategoriesIds}
              placeholder="Kategorien auswählen"
              animation={1}
              onValueChange={(selectedValues) => {
                setEinsatzCategoriesIds(selectedValues);
              }}
            />
          </FormGroup>
          <div className="flex flex-col gap-4">
            <FormGroup className="flex flex-row">
              <FormInputFieldCustom className="flex-1" name="Start Datum">
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="start_datum"
                      variant={"outline"}
                      className={cn(
                        "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "truncate",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        {startDate
                          ? format(startDate, "PPP", { locale: de })
                          : "Datum auswählen"}
                      </span>
                      <RiCalendarLine
                        size={16}
                        className="text-muted-foreground/80 shrink-0"
                        aria-hidden="true"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      defaultMonth={startDate}
                      locale={de}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(date);
                          // If end date is before the new start date, update it to match the start date
                          if (isBefore(endDate, date)) {
                            setEndDate(date);
                          }
                          setError(null);
                          setStartDateOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </FormInputFieldCustom>
              {!all_day && (
                <div className="min-w-28 *:not-first:mt-1.5">
                  <FormInputFieldCustom name="Start Zeit">
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger id="start_time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormInputFieldCustom>
                </div>
              )}
            </FormGroup>
            <FormGroup className="flex flex-row">
              <FormInputFieldCustom className="flex-1" name="Ende Datum">
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="ende_datum"
                      variant={"outline"}
                      className={cn(
                        "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "truncate",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        {endDate
                          ? format(endDate, "PPP", { locale: de })
                          : "Datum auswählen"}
                      </span>
                      <RiCalendarLine
                        size={16}
                        className="text-muted-foreground/80 shrink-0"
                        aria-hidden="true"
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      defaultMonth={endDate}
                      locale={de}
                      onSelect={(date) => {
                        if (date) {
                          setEndDate(date);
                          setError(null);
                          setEndDateOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </FormInputFieldCustom>
              {!all_day && (
                <div className="min-w-28 *:not-first:mt-1.5">
                  <FormInputFieldCustom name="Ende Zeit">
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger id="end_time">
                        <SelectValue placeholder="Zeit auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormInputFieldCustom>
                </div>
              )}
            </FormGroup>
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-day"
                checked={all_day}
                onCheckedChange={(checked) => setAllDay(checked === true)}
              />
              <Label htmlFor="all-day">Ganztägig</Label>
            </div>
          </div>

          <FormGroup>
            <FormField
              name="Teilnehmeranzahl"
              type="number"
              value={participantCount || ""}
              placeholder=""
              onChange={(e) => setParticipantCount(Number(e.target.value) || 0)}
            />
            <FormField
              className="flex-1"
              name="Preis pro Person"
              type="number"
              value={pricePerPerson || ""}
              onChange={(e) => setPricePerPerson(Number(e.target.value) || 0)}
            />
          </FormGroup>
        </div>
        <DialogFooter className="flex-row sm:justify-between">
          {currentEinsatz?.id && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              aria-label="Einsatz löschen"
            >
              <RiDeleteBinLine size={16} aria-hidden="true" />
            </Button>
          )}
          <div className="flex flex-1 justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleSave}>Speichern</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
