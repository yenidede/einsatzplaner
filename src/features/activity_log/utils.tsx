import { JSX } from 'react';
import { ChangeLogEntry } from './types';
import { Einsatz } from '../einsatz/types';
import TooltipCustom from '@/components/tooltip-custom';

type smallActivity = Pick<
  ChangeLogEntry,
  'change_type' | 'user' | 'affected_user_data'
> & { einsatz: Pick<Einsatz, 'title' | 'id'> };

export function getFormattedMessage(
  activity: smallActivity,
  openDialog?: (id: string) => void
): JSX.Element {
  const actorName = getFullName(activity.user);
  const affectedName = getFullName(
    activity.affected_user_data ?? { firstname: '', lastname: '' }
  );

  const message = openDialog
    ? activity.change_type.message
    : activity.change_type.message.replace(
        /Einsatz/g,
        `'${activity.einsatz.title}'`
      );

  return (
    <>
      {/* In database dynamic values are typed as static: 'Username' => user.name */}
      {message
        .split(/\b(Username|AffectedUsername|Einsatz)\b/)
        .map((part, index) => {
          if (part === 'Username') {
            return (
              <TooltipCustom
                text={activity.user.email}
                key={activity.user.email}
              >
                <span key={index} style={{ textDecoration: 'underline' }}>
                  {actorName}
                </span>
              </TooltipCustom>
            );
          }
          if (part === 'AffectedUsername') {
            return (
              <TooltipCustom
                text={activity.affected_user_data?.email || ''}
                key={index}
              >
                <span key={index} style={{ textDecoration: 'underline' }}>
                  {affectedName}
                </span>
              </TooltipCustom>
            );
          }
          if (part === 'Einsatz') {
            return (
              <span
                className="cursor-pointer underline"
                onClick={() => openDialog && openDialog(activity.einsatz.id)}
                key={index}
              >
                '{activity.einsatz.title}'
              </span>
            );
          }
          return part;
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
  // takeover after the first assignment of a potential einsatz
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
  const addedUsers = currentAssignedUsers.filter(
    (id) => !previousAssignedUsers.includes(id)
  );
  if (addedUsers.length > 0) {
    return addedUsers[0];
  }

  const removedUsers = previousAssignedUsers.filter(
    (id) => !currentAssignedUsers.includes(id)
  );
  if (removedUsers.length > 0) {
    return removedUsers[0];
  }

  return currentAssignedUsers[0] || null;
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

  if (previousAssignedUsers.length > 0 && currentAssignedUsers.length === 0) {
    changeTypes.push('cancel');
    return changeTypes;
  }

  if (
    currentUserId &&
    previousAssignedUsers.length > 0 &&
    !previousAssignedUsers.includes(currentUserId) &&
    currentAssignedUsers.includes(currentUserId)
  ) {
    changeTypes.push('takeover');
    return changeTypes;
  }

  if (currentAssignedUsers.length > previousAssignedUsers.length) {
    changeTypes.push('assign');
    return changeTypes;
  }

  if (currentAssignedUsers.length < previousAssignedUsers.length) {
    changeTypes.push('cancel');
    return changeTypes;
  }
  changeTypes.push('edit');
  return changeTypes;
}

export function getAffectedUserIds(
  previousAssignedUsers: string[],
  currentAssignedUsers: string[]
): string[] {
  const addedUsers = currentAssignedUsers.filter(
    (id) => !previousAssignedUsers.includes(id)
  );

  if (addedUsers.length > 0) {
    return addedUsers;
  }

  const removedUsers = previousAssignedUsers.filter(
    (id) => !currentAssignedUsers.includes(id)
  );

  if (removedUsers.length > 0) {
    return removedUsers;
  }

  return currentAssignedUsers.length > 0 ? [currentAssignedUsers[0]] : [];
}
