import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { BookingFooter } from "../shared/PDFBookingFooter";
import { PDFHeader } from "../shared/PDFHeader";
import { PDFContactSection } from "../shared/PDFContactSection";
import { PDFCostInfo } from "../shared/PDFCostInfo";
import { PDFCancellationText } from "../shared/PDFCancellationText";
import { PDFSignature } from "../shared/PDFSignature";
import type { Einsatz } from "@/features/einsatz/types";
import { OrganizationForPDF } from "@/features/organization/types";
import { commonStyles } from "../styles/common-styles";
import type { AssignedUser, EinsatzCategory, PDFOptions } from "../types/types";
import {
  formatDate,
  formatTime,
  formatAssignedUserNames,
  formatCurrentUserName,
} from "../utils/pdf-helpers";

type BookingConfirmationPDFProps = {
  einsatz: Einsatz;
  einsatzCategories: EinsatzCategory[];
  organization: OrganizationForPDF;
  assignedUsers: AssignedUser[];
  currentUser?: AssignedUser | null;
  options?: PDFOptions;
};

export const BookingConfirmationPDF_Group: React.FC<
  BookingConfirmationPDFProps
> = ({
  einsatz,
  einsatzCategories,
  organization,
  assignedUsers = [],
  currentUser,
  options,
}) => {
  const { showLogos = true } = options || {};
  const participantCount = einsatz.participant_count ?? 0;
  const assignedUserNames = formatAssignedUserNames(assignedUsers);
  const currentUserName = formatCurrentUserName(currentUser);
  const pricePerPerson = einsatz.price_per_person?.toFixed(2) ?? "9,00";
  const pauschale = einsatz.total_price?.toFixed(2) ?? "90,00";
  const orgName = organization?.name ?? "Jüdisches Museum Hohenems";

  const isSchule = einsatzCategories.some((category) =>
    (category.value ?? "").toLowerCase().includes("schule")
  );

  const programDisplay =
    einsatzCategories
      .map((cat) => cat.value)
      .filter(Boolean)
      .join(", ") || einsatz.title;

  return (
    <Page size="A4" style={commonStyles.page}>
      <PDFHeader logoUrl={organization?.logo_url} showLogos={showLogos} />

      <Text style={commonStyles.greeting}>Sehr geehrte,</Text>
      <Text style={commonStyles.text}>
        gerne bestätigen wir Ihnen die Buchung einer Führung im {orgName}:
      </Text>

      <View style={commonStyles.infoBox}>
        <View style={commonStyles.infoRow}>
          <Text style={commonStyles.label}>Gruppe:</Text>
          <View style={commonStyles.value}>
            <Text style={commonStyles.bold}>
              {isSchule ? einsatz.title : "Gruppe"}
            </Text>
            <Text style={commonStyles.paragraph}>
              {isSchule
                ? `${participantCount} Schüler*innen`
                : `${participantCount} Erwachsene / Senioren`}
            </Text>
          </View>
        </View>

        <View style={commonStyles.infoRow}>
          <Text style={commonStyles.label}>Zeit:</Text>
          <View style={commonStyles.value}>
            <Text style={commonStyles.bold}>{formatDate(einsatz.start)}</Text>
            <Text style={commonStyles.paragraph}>
              {formatTime(einsatz.start)} – {formatTime(einsatz.end)}
            </Text>
          </View>
        </View>

        <View style={commonStyles.infoRow}>
          <Text style={commonStyles.label}>Programm:</Text>
          <Text style={[commonStyles.value, commonStyles.bold]}>
            {programDisplay}
          </Text>
        </View>

        <View style={commonStyles.infoRow}>
          <Text style={commonStyles.label}>Vermittlung:</Text>
          <Text style={[commonStyles.value, commonStyles.bold]}>
            {assignedUserNames}
          </Text>
        </View>

        <PDFCostInfo
          pricePerPerson={pricePerPerson}
          pauschale={pauschale}
          minParticipants={10}
        />
      </View>

      <PDFCancellationText />
      <PDFSignature userName={currentUserName} />
      <PDFContactSection organization={organization} />
      <BookingFooter organization={organization} />
    </Page>
  );
};
