"use server";

import prisma from "@/lib/prisma";
import type {
  field,
  type as FieldType,
  user_property,
} from "@/generated/prisma";
import { requireAuth } from "@/lib/auth/authGuard";

export interface UserPropertyWithField {
  id: string;
  field_id: string;
  org_id: string;
  field: {
    id: string;
    name: string | null;
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

/**
 * Holt alle User Properties für eine Organisation
 */
export async function getUserPropertiesByOrgId(
  orgId: string
): Promise<UserPropertyWithField[]> {
  const { session } = await requireAuth();

  // Prüfe ob User Zugriff auf diese Organisation hat
  if (!session.user.orgIds.includes(orgId)) {
    throw new Error("Unauthorized to access this organization");
  }

  const properties = await prisma.user_property.findMany({
    where: { org_id: orgId },
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

  // Zähle Anzahl der Personen mit Wert für jede Property
  return properties.map((prop) => ({
    id: prop.id,
    field_id: prop.field_id,
    org_id: prop.org_id,
    field: prop.field,
    userCount: prop.user_property_value.length,
  }));
}

/**
 * Holt alle vorhandenen Property-Namen für eine Organisation
 */
export async function getExistingPropertyNames(
  orgId: string
): Promise<string[]> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error("Unauthorized to access this organization");
  }

  const properties = await prisma.user_property.findMany({
    where: { org_id: orgId },
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

/**
 * Holt die Anzahl der User in einer Organisation
 */
export async function getUserCountByOrgId(orgId: string): Promise<number> {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error("Unauthorized to access this organization");
  }

  const count = await prisma.user_organization_role.count({
    where: { org_id: orgId },
  });

  return count;
}

/**
 * Holt einen Type anhand des datatype-Strings
 */
export async function getTypeByDatatype(
  datatype: string
): Promise<FieldType | null> {
  return await prisma.type.findFirst({
    where: { datatype },
  });
}

/**
 * Erstellt oder findet einen Type
 */
async function ensureTypeExists(datatype: string): Promise<string> {
  // Versuche existierenden Type zu finden
  let type = await prisma.type.findFirst({
    where: { datatype },
  });

  // Falls nicht vorhanden, erstelle neuen Type
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
  datatype: "text" | "number" | "boolean" | "select";
  isRequired: boolean;
  placeholder?: string;
  defaultValue?: string;
  isMultiline?: boolean;
  min?: number;
  max?: number;
  allowedValues?: string[];
  orgId: string;
}

/**
 * Erstellt eine neue User Property
 */
export async function createUserProperty(
  input: CreateUserPropertyInput
): Promise<UserPropertyWithField> {
  const { session } = await requireAuth();

  // Prüfe ob User Zugriff auf diese Organisation hat
  if (!session.user.orgIds.includes(input.orgId)) {
    throw new Error("Unauthorized to access this organization");
  }

  // Stelle sicher, dass der Type existiert
  const typeId = await ensureTypeExists(input.datatype);

  // Erstelle zuerst das Field
  const field = await prisma.field.create({
    data: {
      name: input.name,
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

  // Dann erstelle die User Property (Verknüpfung zur Organisation)
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

/**
 * Aktualisiert eine User Property
 */
export async function updateUserProperty(
  input: UpdateUserPropertyInput
): Promise<UserPropertyWithField> {
  const { session } = await requireAuth();

  // Hole die User Property um die Berechtigung zu prüfen
  const userProperty = await prisma.user_property.findUnique({
    where: { id: input.id },
    include: { field: true },
  });

  if (!userProperty) {
    throw new Error("User Property not found");
  }

  if (!session.user.orgIds.includes(userProperty.org_id)) {
    throw new Error("Unauthorized to update this property");
  }

  // Update das Field
  const updatedField = await prisma.field.update({
    where: { id: userProperty.field_id },
    data: {
      name: input.name,
      is_required: input.isRequired,
      placeholder: input.placeholder,
      default_value: input.defaultValue,
      is_multiline: input.isMultiline,
      min: input.min,
      max: input.max,
      allowed_values: input.allowedValues,
    },
  });

  // Hole die aktualisierte User Property mit allen Relations
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
    throw new Error("Failed to fetch updated property");
  }

  return {
    id: updated.id,
    field_id: updated.field_id,
    org_id: updated.org_id,
    field: updated.field,
    userCount: updated.user_property_value.length,
  };
}

/**
 * Löscht eine User Property
 */
export async function deleteUserProperty(id: string): Promise<void> {
  const { session } = await requireAuth();

  // Hole die User Property um die Berechtigung zu prüfen
  const userProperty = await prisma.user_property.findUnique({
    where: { id },
  });

  if (!userProperty) {
    throw new Error("User Property not found");
  }

  if (!session.user.orgIds.includes(userProperty.org_id)) {
    throw new Error("Unauthorized to delete this property");
  }

  // Lösche die User Property (Cascade löscht auch field und user_property_values)
  await prisma.user_property.delete({
    where: { id },
  });
}
