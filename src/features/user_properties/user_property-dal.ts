'use server';

import prisma from '@/lib/prisma';
import type {
  type as FieldType,
} from '@/generated/prisma';
import { requireAuth } from '@/lib/auth/authGuard';

export interface UserPropertyWithField {
  id: string;
  field_id: string;
  org_id: string;
  field: {
    id: string;
    name: string | null;
    description: string | null;
    type_id: string | null;
    is_required: boolean;
    placeholder: string | null;
    default_value: string | null;
    group_name: string | null;
    is_multiline: boolean | null;
    min: number | null;
    max: number | null;
    allowed_values: string[];
    type: {
      id: string;
      name: string | null;
      datatype: string | null;
    } | null;
  };
  userCount?: number;
}

export async function getUserPropertiesByOrgId(
  orgId: string
): Promise<UserPropertyWithField[]> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error('Unauthorized to access this organization');
  }

  const properties = await prisma.user_property.findMany({
    where: { org_id: orgId },
    orderBy: { field: { name: 'asc' } },
    include: {
      field: {
        include: {
          type: {
            select: {
              id: true,
              name: true,
              datatype: true,
            },
          },
        },
      },
      user_property_value: {
        select: {
          id: true,
        },
      },
    },
  });

  return properties.map((prop) => ({
    id: prop.id,
    field_id: prop.field_id,
    org_id: prop.org_id,
    field: prop.field,
    userCount: prop.user_property_value.length,
  }));
}

export async function getExistingPropertyNames(
  orgId: string
): Promise<string[]> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error('Unauthorized to access this organization');
  }

  const properties = await prisma.user_property.findMany({
    where: { org_id: orgId },
    orderBy: { field: { name: 'asc' } },
    include: {
      field: {
        select: {
          name: true,
        },
      },
    },
  });

  return properties
    .map((prop) => prop.field.name)
    .filter((name): name is string => name !== null)
    .map((name) => name.toLowerCase());
}

export async function getUserCountByOrgId(orgId: string): Promise<number> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error('Unauthorized to access this organization');
  }

  const uniqueUsers = await prisma.user_organization_role.findMany({
    where: { org_id: orgId },
    select: { user_id: true },
    distinct: ['user_id'],
  });

  const count = uniqueUsers.length;

  return count;
}

export async function getTypeByDatatype(
  datatype: string
): Promise<FieldType | null> {
  return await prisma.type.findFirst({
    where: { datatype },
  });
}

async function ensureTypeExists(datatype: string): Promise<string> {
  let type = await prisma.type.findFirst({
    where: { datatype },
  });

  if (!type) {
    type = await prisma.type.create({
      data: {
        name: datatype,
        datatype: datatype,
        description: `Auto-generated type for ${datatype}`,
      },
    });
  }

  return type.id;
}

export interface CreateUserPropertyInput {
  name: string;
  description?: string;
  datatype:
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'currency'
  | 'group'
  | 'date'
  | 'time'
  | 'phone'
  | 'mail';
  isRequired: boolean;
  placeholder?: string;
  defaultValue?: string;
  isMultiline?: boolean;
  min?: number;
  max?: number;
  allowedValues?: string[];
  orgId: string;
}

export async function createUserProperty(
  input: CreateUserPropertyInput
): Promise<UserPropertyWithField> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(input.orgId)) {
    throw new Error('Unauthorized to access this organization');
  }

  const typeId = await ensureTypeExists(input.datatype);

  const field = await prisma.field.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      type_id: typeId,
      is_required: input.isRequired,
      placeholder: input.placeholder,
      default_value: input.defaultValue,
      is_multiline: input.isMultiline,
      min: input.min,
      max: input.max,
      allowed_values: input.allowedValues || [],
    },
  });

  const userProperty = await prisma.user_property.create({
    data: {
      field_id: field.id,
      org_id: input.orgId,
    },
    include: {
      field: {
        include: {
          type: {
            select: {
              id: true,
              name: true,
              datatype: true,
            },
          },
        },
      },
    },
  });

  return {
    id: userProperty.id,
    field_id: userProperty.field_id,
    org_id: userProperty.org_id,
    field: userProperty.field,
    userCount: 0,
  };
}

export interface UpdateUserPropertyInput {
  id: string;
  name?: string;
  description?: string;
  isRequired?: boolean;
  placeholder?: string;
  defaultValue?: string;
  isMultiline?: boolean;
  min?: number;
  max?: number;
  allowedValues?: string[];
}

export async function updateUserProperty(
  input: UpdateUserPropertyInput
): Promise<UserPropertyWithField> {
  const { session } = await requireAuth();

  const userProperty = await prisma.user_property.findUnique({
    where: { id: input.id },
    include: { field: true },
  });

  if (!userProperty) {
    throw new Error('User Property not found');
  }

  if (!session.user.orgIds.includes(userProperty.org_id)) {
    throw new Error('Unauthorized to update this property');
  }

  await prisma.field.update({
    where: { id: userProperty.field_id },
    data: {
      name: input.name,
      description: input.description ?? null,
      is_required: input.isRequired,
      placeholder: input.placeholder,
      default_value: input.defaultValue,
      is_multiline: input.isMultiline,
      min: input.min,
      max: input.max,
      allowed_values: input.allowedValues,
    },
  });

  const updated = await prisma.user_property.findUnique({
    where: { id: input.id },
    include: {
      field: {
        include: {
          type: {
            select: {
              id: true,
              name: true,
              datatype: true,
            },
          },
        },
      },
      user_property_value: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!updated) {
    throw new Error('Failed to fetch updated property');
  }

  return {
    id: updated.id,
    field_id: updated.field_id,
    org_id: updated.org_id,
    field: updated.field,
    userCount: updated.user_property_value.length,
  };
}

export async function deleteUserProperty(id: string): Promise<void> {
  const { session } = await requireAuth();

  const userProperty = await prisma.user_property.findUnique({
    where: { id },
  });

  if (!userProperty) {
    throw new Error('User Property not found');
  }

  if (!session.user.orgIds.includes(userProperty.org_id)) {
    throw new Error('Unauthorized to delete this property');
  }

  const fieldId = userProperty.field_id;

  await prisma.user_property.delete({
    where: { id },
  });

  await prisma.field.delete({
    where: { id: fieldId },
  });
}

export interface UserPropertyValue {
  id: string;
  user_property_id: string;
  user_id: string;
  value: string;
  user_property: UserPropertyWithField;
}

export async function getUserPropertyValues(
  userId: string,
  orgId: string
): Promise<UserPropertyValue[]> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error('Unauthorized to access this organization');
  }

  const values = await prisma.user_property_value.findMany({
    where: {
      user_id: userId,
      user_property: {
        org_id: orgId,
      },
    },
    orderBy: { user_property: { field: { name: 'asc' } } },
    include: {
      user_property: {
        include: {
          field: {
            include: {
              type: {
                select: {
                  id: true,
                  name: true,
                  datatype: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return values.map((val) => ({
    id: val.id,
    user_property_id: val.user_property_id,
    user_id: val.user_id,
    value: val.value,
    user_property: {
      id: val.user_property.id,
      field_id: val.user_property.field_id,
      org_id: val.user_property.org_id,
      field: val.user_property.field,
    },
  }));
}

export async function upsertUserPropertyValue(
  userId: string,
  userPropertyId: string,
  value: string
): Promise<void> {
  const { session } = await requireAuth();

  const userProperty = await prisma.user_property.findUnique({
    where: { id: userPropertyId },
    include: {
      field: {
        select: {
          name: true,
          is_required: true,
        },
      },
    },
  });

  if (!userProperty) {
    throw new Error('User property not found');
  }

  if (!session.user.orgIds.includes(userProperty.org_id)) {
    throw new Error('Unauthorized');
  }

  if (userProperty.field.is_required && (!value || value.trim() === '')) {
    throw new Error(
      `Das Feld "${userProperty.field.name || 'Unbekannt'
      }" ist ein Pflichtfeld und darf nicht leer sein.`
    );
  }

  const existing = await prisma.user_property_value.findFirst({
    where: {
      user_id: userId,
      user_property_id: userPropertyId,
    },
  });

  if (existing) {
    await prisma.user_property_value.update({
      where: { id: existing.id },
      data: { value },
    });
  } else {
    await prisma.user_property_value.create({
      data: {
        user_id: userId,
        user_property_id: userPropertyId,
        value,
      },
    });
  }
}

export async function deleteUserPropertyValue(
  userId: string,
  userPropertyId: string
): Promise<void> {
  const { session } = await requireAuth();

  const userProperty = await prisma.user_property.findUnique({
    where: { id: userPropertyId },
  });

  if (!userProperty) {
    throw new Error('User property not found');
  }

  if (!session.user.orgIds.includes(userProperty.org_id)) {
    throw new Error('Unauthorized');
  }

  await prisma.user_property_value.deleteMany({
    where: {
      user_id: userId,
      user_property_id: userPropertyId,
    },
  });
}
