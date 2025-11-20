import React from "react";
import { Text, StyleSheet } from "@react-pdf/renderer";
import type { OrganizationForPDF } from "@/features/organization/types";

const styles = StyleSheet.create({
  contact: {
    fontSize: 8,
    color: "#666",
    marginTop: 10,
    lineHeight: 1.6,
  },
});

interface BookingFooterProps {
  organization: OrganizationForPDF;
}

export const BookingFooter: React.FC<BookingFooterProps> = ({
  organization,
}) => {
  const addressLines = organization.addresses.map((addr) => {
    const parts = [];
    if (addr.label) parts.push(addr.label);
    parts.push(addr.street);
    parts.push(`${addr.postal_code} ${addr.city}`);
    if (addr.country !== "Österreich") parts.push(addr.country);
    return parts.join(" | ");
  });

  const contactParts = [];
  if (organization.phone) contactParts.push(`T ${organization.phone}`);
  if (organization.email) contactParts.push(organization.email);
  if (organization.details?.website)
    contactParts.push(organization.details.website);

  const legalParts = [];
  if (organization.details?.vat)
    legalParts.push(`UID ${organization.details.vat}`);
  if (organization.details?.zvr)
    legalParts.push(`ZVR ${organization.details.zvr}`);
  if (organization.details?.authority)
    legalParts.push(`Behörde: ${organization.details.authority}`);

  const bankLines = organization.bankAccounts.map((bank) => {
    return `${bank.bank_name} IBAN ${bank.iban} | BIC ${bank.bic}`;
  });

  const footerText = [
    // Line 1: Organization name + Addresses
    [organization.name, ...addressLines].join(" | "),

    // Line 2: Contact + Legal
    [...contactParts, ...legalParts].join(" | "),

    // Line 3+: Bank accounts (each on new line)
    ...bankLines,
  ]
    .filter(Boolean)
    .join("\n");

  return <Text style={styles.contact}>{footerText}</Text>;
};
