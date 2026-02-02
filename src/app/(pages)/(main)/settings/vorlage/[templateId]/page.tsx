'use client';

import { useParams } from 'next/navigation';
import { TemplateForm } from '@/components/template/TemplateForm';

export default function EditTemplatePage() {
  const params = useParams();
  const templateId = params?.templateId as string;

  return <TemplateForm templateId={templateId} />;
}
