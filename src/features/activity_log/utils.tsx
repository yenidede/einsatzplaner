import { Fragment, JSX } from 'react';
import { ChangeLogEntry } from './types';
import { Einsatz } from '../einsatz/types';
import TooltipCustom from '@/components/tooltip-custom';
import Link from 'next/link';

const USER_NOT_FOUND_LABEL = 'Nutzer nicht gefunden';
const EINSATZ_NOT_FOUND_LABEL = 'Einsatz nicht gefunden';

type smallActivity = Pick<
  ChangeLogEntry,
  'change_type' | 'user' | 'affected_user_data'
> & {
  einsatz:
    | (Pick<Einsatz, 'title' | 'id' | 'start' | 'end'> & {
        all_day?: boolean;
      })
    | null;
};

/** Compiled once; used by getFormattedMessage to split message template. */
const MESSAGE_PLACEHOLDER_REGEX = /\b(Username|AffectedUsername|Einsatz)\b/;

const UNDERLINE_STYLE = { textDecoration: 'underline' as const };

const dateOpts: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};
const timeOpts: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

const dateFormatter = new Intl.DateTimeFormat('de-DE', dateOpts);
const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  ...timeOpts,
  hour12: false,
});

function formatEinsatzTooltipDateRange(
  start: Date,
  end: Date,
  allDay: boolean
): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const dateStr = (d: Date) => dateFormatter.format(d);
  const timeStr = (d: Date) => timeFormatter.format(d);

  if (sameDay) {
    if (allDay) return `${dateStr(s)}, Ganztägig`;
    return `${dateStr(s)}, ${timeStr(s)} – ${timeStr(e)}`;
  }
  if (allDay) return `${dateStr(s)} – ${dateStr(e)}, Ganztägig`;
  return `${dateStr(s)}, ${timeStr(s)} – ${dateStr(e)}, ${timeStr(e)}`;
}

export function getFormattedMessage(
  activity: smallActivity,
  openDialog?: (id: string) => void
): JSX.Element {
  const actorName = activity.user
    ? getFullName(activity.user)
    : USER_NOT_FOUND_LABEL;
  const affectedName = getFullName(
    activity.affected_user_data ?? { firstname: '', lastname: '' }
  );

  const einsatzTitle = activity.einsatz?.title ?? EINSATZ_NOT_FOUND_LABEL;
  const message = openDialog
    ? activity.change_type.message
    : activity.change_type.message.replace(/Einsatz/g, `'${einsatzTitle}'`);

  const parts = message.split(MESSAGE_PLACEHOLDER_REGEX);
  const { user, affected_user_data, einsatz } = activity;

  return (
    <>
      {parts.map((part, index) => {
        if (part === 'Username') {
          return (
            <TooltipCustom
              text={user?.email ?? USER_NOT_FOUND_LABEL}
              key={user?.email ?? `user-${index}`}
            >
              <span style={UNDERLINE_STYLE}>{actorName}</span>
            </TooltipCustom>
          );
        }
        if (part === 'AffectedUsername') {
          return (
            <TooltipCustom
              text={affected_user_data?.email ?? ''}
              key={`aff-${index}`}
            >
              <span style={UNDERLINE_STYLE}>{affectedName}</span>
            </TooltipCustom>
          );
        }
        if (part === 'Einsatz') {
          if (!einsatz) {
            return (
              <span key={`einsatz-${index}`} title={EINSATZ_NOT_FOUND_LABEL}>
                &apos;{EINSATZ_NOT_FOUND_LABEL}&apos;
              </span>
            );
          }
          const tooltipText = `'${einsatz.title}' (${formatEinsatzTooltipDateRange(einsatz.start, einsatz.end, einsatz.all_day ?? false)}) öffnen`;
          return (
            <TooltipCustom text={tooltipText} key={einsatz.id}>
              <Link
                href={`/einsatz/${einsatz.id}`}
                className="cursor-pointer"
                style={UNDERLINE_STYLE}
              >
                &apos;{einsatz.title}&apos;
              </Link>
            </TooltipCustom>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

const getFullName = (user: { firstname: string; lastname: string }) => {
  return `${user.firstname} ${user.lastname}`;
};

export function detectChangeType(
  isNew: boolean,
  previousAssignedUsers: string[],
  currentAssignedUsers: string[],
  currentUserId?: string
): string {
  if (isNew) {
    return 'create';
  }

  if (previousAssignedUsers.length === 0 && currentAssignedUsers.length > 0) {
    return 'assign';
  }
  if (previousAssignedUsers.length > 0 && currentAssignedUsers.length === 0) {
    return 'cancel';
  }
  if (
    currentUserId &&
    !previousAssignedUsers.includes(currentUserId) &&
    currentAssignedUsers.includes(currentUserId)
  ) {
    return 'takeover';
  }
  if (currentAssignedUsers.length > previousAssignedUsers.length) {
    return 'assign';
  }

  if (currentAssignedUsers.length < previousAssignedUsers.length) {
    return 'cancel';
  }

  return 'edit';
}

export function getAffectedUserId(
  previousAssignedUsers: string[],
  currentAssignedUsers: string[]
): string | null {
  const prevSet = new Set(previousAssignedUsers);
  const currSet = new Set(currentAssignedUsers);
  for (const id of currentAssignedUsers) {
    if (!prevSet.has(id)) return id;
  }
  for (const id of previousAssignedUsers) {
    if (!currSet.has(id)) return id;
  }
  return currentAssignedUsers[0] ?? null;
}

export function detectChangeTypes(
  isNew: boolean,
  previousAssignedUsers: string[],
  currentAssignedUsers: string[],
  currentUserId?: string
): string[] {
  const changeTypes: string[] = [];

  if (isNew) {
    changeTypes.push('create');
    if (currentAssignedUsers.length > 0) {
      changeTypes.push('assign');
    }
    return changeTypes;
  }

  if (previousAssignedUsers.length === 0 && currentAssignedUsers.length > 0) {
    changeTypes.push('assign');
    return changeTypes;
  }

  if (
    currentUserId &&
    !previousAssignedUsers.includes(currentUserId) &&
    currentAssignedUsers.includes(currentUserId)
  ) {
    changeTypes.push('takeover');
    return changeTypes;
  }

  if (currentAssignedUsers.length < previousAssignedUsers.length) {
    const removedUsers = previousAssignedUsers.filter(
      (id) => !currentAssignedUsers.includes(id)
    );

    if (currentUserId && removedUsers.includes(currentUserId)) {
      changeTypes.push('cancel');
    } else {
      changeTypes.push('remove');
    }
    return changeTypes;
  }

  if (currentAssignedUsers.length > previousAssignedUsers.length) {
    changeTypes.push('assign');
    return changeTypes;
  }
  changeTypes.push('edit');
  return changeTypes;
}

export function getAffectedUserIds(
  previousAssignedUsers: string[],
  currentAssignedUsers: string[]
): string[] {
  const prevSet = new Set(previousAssignedUsers);
  const currSet = new Set(currentAssignedUsers);
  const added = currentAssignedUsers.filter((id) => !prevSet.has(id));
  if (added.length > 0) return added;
  const removed = previousAssignedUsers.filter((id) => !currSet.has(id));
  if (removed.length > 0) return removed;
  return currentAssignedUsers.length > 0 ? [currentAssignedUsers[0]] : [];
}
