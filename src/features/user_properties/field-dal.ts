import prisma from '@/lib/prisma';
import { parseMultiSelectValue } from './utils/select-values';

export async function assertCanChangeMultiselectToSelect(
  fieldId: string,
  nextDatatype: string
): Promise<void> {
  if (nextDatatype !== 'select') {
    return;
  }

  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    select: {
      type: {
        select: {
          datatype: true,
        },
      },
    },
  });

  if (field?.type?.datatype !== 'multiselect') {
    return;
  }

  const [einsatzValues, userPropertyValues] = await Promise.all([
    prisma.einsatz_field.findMany({
      where: { field_id: fieldId },
      select: { value: true },
    }),
    prisma.user_property_value.findMany({
      where: {
        user_property: {
          field_id: fieldId,
        },
      },
      select: { value: true },
    }),
  ]);

  const hasMultipleStoredValues = [
    ...einsatzValues,
    ...userPropertyValues,
  ].some(({ value }) => parseMultiSelectValue(value).length > 1);

  if (hasMultipleStoredValues) {
    throw new Error(
      'Mehrfachauswahl kann nicht deaktiviert werden, solange mindestens ein Datensatz mehrere Werte enthält.'
    );
  }
}
