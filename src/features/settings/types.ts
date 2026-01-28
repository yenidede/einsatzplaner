import type { organization } from '@/generated/prisma';
import type { RoleType } from '@/components/Roles';
import type { salutation } from '@/generated/prisma';

export type OrganizationBase = Pick<organization, 'id' | 'name' | 'helper_name_singular' | 'helper_name_plural' | 'logo_url' | 'small_logo_url'> & {
  roles: RoleType[];
  hasGetMailNotification: boolean;
};

export type Salutation = salutation;
