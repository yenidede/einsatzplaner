import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Editor } from '@tiptap/react';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';
import { documentTemplateBlockGroups } from '../document-template-block-groups';
import type {
  EditableArea,
  SelectedDynamicField,
} from '../types/documentTemplateEditorTypes';
import {
  createSampleResolvedFields,
  getSelectedDynamicField,
  groupLabels,
} from '../utils/documentTemplateEditorUtils';

export function useDocumentTemplateFields({
  blockSearch,
  einsatzNamePlural,
  fields,
  organizationLogoUrl,
  setSelectedDynamicField,
}: {
  blockSearch: string;
  einsatzNamePlural?: string | null;
  fields: DocumentTemplateFieldDefinition[];
  organizationLogoUrl: string | null;
  setSelectedDynamicField: Dispatch<
    SetStateAction<SelectedDynamicField | null>
  >;
}) {
  const previewFields = useMemo(() => {
    const resolvedFields = createSampleResolvedFields(fields);
    const logoField = resolvedFields.organizationLogoUrl;
    if (!logoField || !organizationLogoUrl) return resolvedFields;

    return {
      ...resolvedFields,
      organizationLogoUrl: {
        ...logoField,
        rawValue: organizationLogoUrl,
        formattedValue: organizationLogoUrl,
      },
    };
  }, [fields, organizationLogoUrl]);

  const fieldByKey = useMemo(
    () => new Map(fields.map((field) => [field.key, field])),
    [fields]
  );
  const effectiveGroupLabels = useMemo(
    () => ({
      ...groupLabels,
      event: einsatzNamePlural?.trim() || 'Einsätze',
    }),
    [einsatzNamePlural]
  );
  const filteredBlockGroups = useMemo(() => {
    const normalizedQuery = blockSearch.trim().toLocaleLowerCase('de-AT');
    if (!normalizedQuery) return documentTemplateBlockGroups;

    return documentTemplateBlockGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          [item.label, group.label, item.description]
            .join(' ')
            .toLocaleLowerCase('de-AT')
            .includes(normalizedQuery)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [blockSearch]);
  const updateSelectedDynamicField = useCallback(
    (targetEditor: Editor | null, area: EditableArea) => {
      setSelectedDynamicField(getSelectedDynamicField(targetEditor, area));
    },
    [setSelectedDynamicField]
  );

  return {
    effectiveGroupLabels,
    fieldByKey,
    filteredBlockGroups,
    previewFields,
    updateSelectedDynamicField,
  };
}
