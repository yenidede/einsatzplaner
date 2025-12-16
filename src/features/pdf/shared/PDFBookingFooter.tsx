import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import type { OrganizationForPDF } from "@/features/organization/types";

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1px solid #e0e0e0",
    paddingTop: 8,
  },
  contact: {
    fontSize: 8,
    color: "#666",
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
    parts.push(`${addr.postal_code.toString()} ${addr.city}`);
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
    [...bankLines].join(" | "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.contact}>{footerText}</Text>
    </View>
  );
};
