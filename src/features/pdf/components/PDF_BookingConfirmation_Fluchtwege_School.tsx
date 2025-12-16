import React from "react";
import { Page, Text, View } from "@react-pdf/renderer";
import { BookingFooter } from "../shared/PDFBookingFooter";
import { PDFHeader } from "../shared/PDFHeader";
import { PDFContactSection } from "../shared/PDFContactSection";
import { PDFCostInfo } from "../shared/PDFCostInfo";
import { PDFCancellationText } from "../shared/PDFCancellationText";
import { PDFSignature } from "../shared/PDFSignature";
import { PDFAnreiseInfo } from "../shared/PDFAnreiseInfo";
import type { Einsatz } from "@/features/einsatz/types";
import { OrganizationForPDF } from "@/features/organization/types";
import { commonStyles } from "../styles/common-styles";
import type {
  AssignedUser,
  EinsatzCategory,
  PDFDisplayOptions,
} from "../types/types";
import {
  formatDate,
  formatTime,
  formatAssignedUserNames,
  formatCurrentUserName,
  getSchulstufe,
} from "../utils/pdf-helpers";

type BookingConfirmationPDFProps = {
  einsatz: Einsatz;
  einsatzCategories: EinsatzCategory[];
  organization: OrganizationForPDF;
  assignedUsers: AssignedUser[];
  currentUser?: AssignedUser | null;
  options?: PDFDisplayOptions;
};

export const BookingConfirmationPDF_Fluchtwege_School: React.FC<
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
  const schulstufe = getSchulstufe(einsatz);
  const assignedUserNames = formatAssignedUserNames(assignedUsers);
  const currentUserName = formatCurrentUserName(currentUser);
  const pricePerPerson = einsatz.price_per_person?.toFixed(2) ?? "3,50";
  const orgName = organization?.name ?? "Jüdisches Museum Hohenems";

  const isFluchtwege = einsatzCategories.some((cat) =>
    (cat.value ?? "").toLowerCase().includes("fluchtweg")
  );

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
            <Text style={commonStyles.bold}>{einsatz.title}</Text>
            <Text style={commonStyles.paragraph}>
              {participantCount} Schüler*innen, {schulstufe}. Schulstufe
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
          <View style={commonStyles.value}>
            <Text style={[commonStyles.bold, { marginBottom: 6 }]}>
              {isFluchtwege ? "Fluchtwege" : einsatz.title}
            </Text>

            {isFluchtwege && (
              <>
                <Text style={commonStyles.paragraph}>
                  Die Exkursion startet beim Jüdischen Museum Hohenems und führt
                  über gut drei Kilometer in zwei Stunden bis zur Schweizer
                  Grenze. Das Ende des Programms ist beim Zollamt Hohenems. Bei
                  dieser Führung wird die Grenze zur Schweiz überschritten, das
                  Mitführen eines gültigen Personalausweises ist daher
                  verpflichtend.
                </Text>

                <Text style={commonStyles.paragraph}>
                  Der Rückweg zum Museum kann in ca. 30 Minuten zurückgelegt
                  werden. Alternativ fährt die Linie RTB 303 stündlich vom
                  Zollamt nach Hohenems Zentrum, auch mit einem Halt beim
                  Bahnhof Hohenems.
                </Text>

                <Text style={commonStyles.paragraph}>
                  Die Exkursion wird in der Regel bei jedem Wetter durchgeführt.
                  Bei sehr schlechtem Wetter wie beispielsweise Gewitter oder
                  starkem Schneefall wird vor Ort über eine Durchführung bzw.
                  ein Alternativprogramm im Museum entschieden. Bitte
                  informieren Sie Ihre Gruppe entsprechend und weisen Sie sie
                  auf wetterangepasste Ausrüstung, Regen- bzw. Sonnenschutz hin.
                  Wir empfehlen das Mitnehmen einer Wasserflasche, während der
                  Exkursion gibt es keine Möglichkeit sich zu verpflegen.
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={commonStyles.infoRow}>
          <Text style={commonStyles.label}>Vermittlung:</Text>
          <Text style={[commonStyles.value, commonStyles.bold]}>
            {assignedUserNames}
          </Text>
        </View>

        <PDFCostInfo
          pricePerPerson={pricePerPerson}
          pauschale="30,00"
          minParticipants={10}
        />
      </View>

      <PDFAnreiseInfo />
      <PDFCancellationText />
      <PDFSignature userName={currentUserName} />
      <PDFContactSection organization={organization} />
      <BookingFooter organization={organization} />
    </Page>
  );
};
