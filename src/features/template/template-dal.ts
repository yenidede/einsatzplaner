"use server";

import prisma from "@/lib/prisma";
import type { einsatz_template as Template } from "@/generated/prisma";

export async function getAllTemplatesByIds(ids: string[]) {
  const templates = await prisma.einsatz_template.findMany({
    where: { id: { in: ids } },
  });
  return templates;
}

export async function getAllTemplatesWithIconByOrgId(org_id: string) {
  const templates = await prisma.einsatz_template.findMany({
    where: { org_id },
    include: {
        template_icon: {
            select: {
                icon_url: true,
            },
        },
    }
  });
  return templates;
}

export async function getTemplateById(id: string) {
  const template = await prisma.einsatz_template.findUnique({
    where: { id },
  });
  return template;
}

// TODO: auth
export async function createTemplate(data: Template) {
  const template = await prisma.einsatz_template.create({
    data,
  });
  return template;
}

// TODO: auth
export async function updateTemplate(id: string, data: Template) {
  const template = await prisma.einsatz_template.update({
    where: { id },
    data,
  });
  return template;
}

// TODO: auth
export async function deleteTemplate(id: string) {
  const template = await prisma.einsatz_template.delete({
    where: { id },
  });
  return template;
}