import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { commonStyles } from "../styles/common-styles";
import type { OrganizationForPDF } from "@/features/organization/types";

type PDFContactSectionProps = {
  organization: OrganizationForPDF;
};

export const PDFContactSection: React.FC<PDFContactSectionProps> = ({
  organization,
}) => {
  return (
    <View style={commonStyles.contactSection}>
      <Text style={commonStyles.bold}>{organization.name}</Text>
      {organization.addresses[0] && (
        <Text>
          {organization.addresses[0].street &&
            organization.addresses[0].street + "\n"}
          {(organization.addresses[0].postal_code ||
            organization.addresses[0].city) &&
            `${organization.addresses[0].postal_code ?? ""} ${
              organization.addresses[0].city ?? ""
            }\n`}
        </Text>
      )}
      {organization.phone && <Text>Tel: {organization.phone}</Text>}
      {organization.email && (
        <Text style={commonStyles.link}>{organization.email}</Text>
      )}
      {organization.details?.website && (
        <Text style={commonStyles.link}>{organization.details.website}</Text>
      )}
      {organization.details?.vat && (
        <Text>UID: {organization.details.vat}</Text>
      )}

      <Text style={{ marginTop: 10, fontWeight: "bold" }}>Öffnungszeiten</Text>
      <Text>Museum und Café: Di bis SO und an Feiertagen 10-17 Uhr</Text>
      <Text>Bibliothek: Di bis FR 10-12 und 14-16 Uhr</Text>
      <Text>Büro: Di bis FR 9-12 und 14-16 Uhr</Text>
    </View>
  );
};
