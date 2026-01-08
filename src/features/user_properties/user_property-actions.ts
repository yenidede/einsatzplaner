'use server';

import {
  createUserProperty,
  getUserPropertiesByOrgId,
  getExistingPropertyNames,
  getUserCountByOrgId,
  updateUserProperty,
  deleteUserProperty,
  getUserPropertyValues,
  upsertUserPropertyValue,
  type CreateUserPropertyInput,
  type UpdateUserPropertyInput,
  type UserPropertyWithField,
} from './user_property-dal';
import type { PropertyConfig } from './types';

export async function getUserPropertiesAction(
  orgId: string
): Promise<UserPropertyWithField[]> {
  try {
    return await getUserPropertiesByOrgId(orgId);
  } catch (error) {
    console.error('Error loading user properties:', error);
    throw error;
  }
}

export async function getExistingPropertyNamesAction(
  orgId: string
): Promise<string[]> {
  try {
    return await getExistingPropertyNames(orgId);
  } catch (error) {
    console.error('Error loading property names:', error);
    throw error;
  }
}

export async function getUserCountAction(orgId: string): Promise<number> {
  try {
    return await getUserCountByOrgId(orgId);
  } catch (error) {
    console.error('Error loading user count:', error);
    throw error;
  }
}

function configToCreateInput(
  config: PropertyConfig,
  orgId: string
): CreateUserPropertyInput {
  // Bestimme datatype basierend auf fieldType
  let datatype: 'text' | 'number' | 'boolean' | 'select';

  switch (config.fieldType) {
    case 'text':
      datatype = 'text';
      break;
    case 'number':
      datatype = 'number';
      break;
    case 'boolean':
      datatype = 'boolean';
      break;
    case 'select':
      datatype = 'select';
      break;
    default:
      throw new Error(`Unknown field type: ${config.fieldType}`);
  }

  let defaultValue: string | undefined;

  if (config.fieldType === 'boolean' && config.booleanDefaultValue !== null) {
    defaultValue = config.booleanDefaultValue ? 'true' : 'false';
  } else if (config.fieldType === 'select' && config.defaultOption) {
    defaultValue = config.defaultOption;
  } else if (config.defaultValue) {
    defaultValue = config.defaultValue;
  }

  return {
    name: config.name,
    description: config.description,
    datatype,
    isRequired: config.isRequired,
    placeholder: config.placeholder,
    defaultValue,
    isMultiline: config.isMultiline,
    min: config.minValue,
    max: config.maxValue,
    allowedValues: config.options,
    orgId,
  };
}

export async function createUserPropertyAction(
  config: PropertyConfig,
  orgId: string
): Promise<UserPropertyWithField> {
  try {
    const input = configToCreateInput(config, orgId);
    return await createUserProperty(input);
  } catch (error) {
    console.error('Error creating user property:', error);
    throw error;
  }
}

export async function updateUserPropertyAction(
  id: string,
  config: Partial<PropertyConfig>
): Promise<UserPropertyWithField> {
  try {
    let maxValue: number | undefined;
    if (config.fieldType === 'text') {
      maxValue = config.maxLength;
    } else if (config.fieldType === 'number') {
      maxValue = config.maxValue;
    }

    const input: UpdateUserPropertyInput = {
      id,
      name: config.name,
      isRequired: config.isRequired,
      placeholder: config.placeholder,
      defaultValue: config.defaultValue,
      isMultiline: config.isMultiline,
      min: config.minValue,
      max: maxValue,
      allowedValues: config.options,
    };

    return await updateUserProperty(input);
  } catch (error) {
    console.error('Error updating user property:', error);
    throw error;
  }
}

export async function deleteUserPropertyAction(id: string): Promise<void> {
  try {
    await deleteUserProperty(id);
  } catch (error) {
    console.error('Error deleting user property:', error);
    throw error;
  }
}

export async function getUserPropertyValuesAction(
  userId: string,
  orgId: string
) {
  try {
    return await getUserPropertyValues(userId, orgId);
  } catch (error) {
    console.error('Error loading user property values:', error);
    throw error;
  }
}

export async function upsertUserPropertyValueAction(
  userId: string,
  userPropertyId: string,
  value: string
): Promise<void> {
  try {
    await upsertUserPropertyValue(userId, userPropertyId, value);
  } catch (error) {
    console.error('Error upserting user property value:', error);
    throw error;
  }
}
