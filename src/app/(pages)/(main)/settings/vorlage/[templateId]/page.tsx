'use client';

import { useParams } from 'next/navigation';
import { TemplateForm } from '@/components/template/TemplateForm';

export default function EditTemplatePage() {
  const params = useParams();
  const templateId =
    typeof params.templateId === 'string' ? params.templateId : null;

  return <TemplateForm templateId={templateId} />;
}
