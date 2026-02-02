'use client';

import { useParams } from 'next/navigation';
import { TemplateForm } from '@/features/template/components/TemplateForm';

export default function EditTemplatePage() {
  const params = useParams();
  const templateId = params?.templateId as string;

  return <TemplateForm templateId={templateId} />;
}
