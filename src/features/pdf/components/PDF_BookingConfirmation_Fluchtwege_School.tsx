import React from "react";
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { BookingFooter } from "./BookingFooter";
import type { Einsatz } from "@/features/einsatz/types";
import { OrganizationForPDF } from "@/features/organization/types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 100,
    fontFamily: "Helvetica",
    fontSize: 12,
  },
  header: { alignItems: "flex-end", marginBottom: 20 },
  logo: { width: 100, height: 50, objectFit: "contain" },
  greeting: { marginBottom: 10, fontSize: 12 },
  text: { marginBottom: 8, lineHeight: 1.4, fontSize: 12 },
  infoBox: {
    paddingVertical: 12,
    marginVertical: 12,
  },
  infoRow: { flexDirection: "row", marginBottom: 8 },
  label: { width: 120, fontWeight: "bold", fontSize: 12 },
  value: { flex: 1, fontSize: 12, lineHeight: 1.35 },
  paragraph: { marginBottom: 6, fontSize: 12, lineHeight: 1.4 },
  bold: { fontWeight: "bold" },
  costInfo: {
    marginTop: 8,
    paddingTop: 6,
    fontSize: 12,
    lineHeight: 1.3,
  },
  contactSection: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 1.4,
  },
  link: { color: "#0066cc", textDecoration: "underline" },
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

type AssignedUser = {
  id: string;
  firstname: string | null;
  lastname: string | null;
  salutation?: {
    id: string;
    salutation: string;
  } | null;
};

interface EinsatzCategory {
  id: string;
  value: string | null;
  abbreviation: string | null;
  label?: string | null;
}

type PDFOptions = {
  showLogos?: boolean;
};

type BookingConfirmationPDFProps = {
  einsatz: Einsatz;
  einsatzCategories: EinsatzCategory[];
  organization: OrganizationForPDF;
  assignedUsers: AssignedUser[];
  currentUser?: AssignedUser | null;
  options?: PDFOptions;
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

  const isSchule = einsatzCategories.some((category) =>
    (category.value ?? "").toLowerCase().includes("schule")
  );

  const participantCount = einsatz.participant_count ?? 0;

  // Schulstufe aus einsatz_fields extrahieren
  const schulstufeField = (einsatz as any).einsatz_fields?.find((field: any) =>
    field.field?.name?.toLowerCase().includes("schulstufe")
  );

  const schulstufe = schulstufeField?.value || "x";

  const assignedUserNames =
    assignedUsers.length > 0
      ? assignedUsers
          .map((user) => {
            const firstname = user.firstname ?? "";
            const lastname = user.lastname ?? "";
            const salutation = user.salutation?.salutation.trim() ?? "";
            return salutation
              ? `${salutation} ${firstname} ${lastname}`.trim()
              : `${firstname} ${lastname}`.trim();
          })
          .filter((name) => name.length > 0)
          .join(", ") || "Wird noch bekannt gegeben"
      : "Wird noch bekannt gegeben";

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return (
      dateObj.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " Uhr"
    );
  };

  const pricePerPerson = einsatz.price_per_person?.toFixed(2) ?? "3,50";
  const minParticipants = 10;
  const pauschale = "30,00";

  const orgName = organization?.name ?? "Jüdisches Museum Hohenems";
  const logoUrl = organization?.logo_url ?? null;

  const isFluchtwege = einsatzCategories.some((cat) =>
    (cat.value ?? "").toLowerCase().includes("fluchtweg")
  );

  // Formatiere den Namen des aktuellen Users
  const currentUserName = currentUser
    ? (() => {
        const firstname = currentUser.firstname ?? "";
        const lastname = currentUser.lastname ?? "";
        const salutation = currentUser.salutation?.salutation.trim() ?? "";
        return salutation
          ? `${salutation} ${firstname} ${lastname}`.trim()
          : `${firstname} ${lastname}`.trim();
      })()
    : "";

  return (
    <Page size="A4" style={styles.page}>
      {/* Header / Logo */}
      {showLogos && logoUrl && (
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
        </View>
      )}

      {/* Intro */}
      <Text style={styles.greeting}>Sehr geehrte,</Text>
      <Text style={styles.text}>
        gerne bestätigen wir Ihnen die Buchung einer Führung im {orgName}:
      </Text>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Gruppe:</Text>
          <View style={styles.value}>
            <Text style={styles.bold}>{einsatz.title}</Text>
            <Text style={styles.paragraph}>
              {participantCount} Schüler*innen, {schulstufe}. Schulstufe
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Zeit:</Text>
          <View style={styles.value}>
            <Text style={styles.bold}>{formatDate(einsatz.start)}</Text>
            <Text style={styles.paragraph}>
              {formatTime(einsatz.start)} – {formatTime(einsatz.end)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Programm:</Text>
          <View style={styles.value}>
            <Text style={[styles.bold, { marginBottom: 6 }]}>
              {isFluchtwege ? "Fluchtwege" : einsatz.title}
            </Text>

            {isFluchtwege && (
              <>
                <Text style={styles.paragraph}>
                  Die Exkursion startet beim Jüdischen Museum Hohenems und führt
                  über gut drei Kilometer in zwei Stunden bis zur Schweizer
                  Grenze. Das Ende des Programms ist beim Zollamt Hohenems. Bei
                  dieser Führung wird die Grenze zur Schweiz überschritten, das
                  Mitführen eines gültigen Personalausweises ist daher
                  verpflichtend.
                </Text>

                <Text style={styles.paragraph}>
                  Der Rückweg zum Museum kann in ca. 30 Minuten zurückgelegt
                  werden. Alternativ fährt die Linie RTB 303 stündlich vom
                  Zollamt nach Hohenems Zentrum, auch mit einem Halt beim
                  Bahnhof Hohenems.
                </Text>

                <Text style={styles.paragraph}>
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

        <View style={styles.infoRow}>
          <Text style={styles.label}>Vermittlung:</Text>
          <Text style={[styles.value, styles.bold]}>{assignedUserNames}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Kosten:</Text>
          <View style={styles.value}>
            <Text style={styles.bold}>
              € {pricePerPerson}/Person bzw. € {pauschale} Pauschale bei weniger
              als {minParticipants} Teilnehmer:innen
            </Text>

            <View style={styles.costInfo}>
              <Text style={styles.bold}>
                Wir bitten Sie, den gesamten Betrag vorher einzusammeln.
              </Text>
              <Text style={{ marginTop: 3 }}>
                Einzel-Zahlungen sind nicht möglich! Auf Wunsch lassen wir Ihnen
                auch gerne eine Rechnung zukommen.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Optional school-specific notice */}

      {/* Anreise - mit Tab-Abstand wie andere Felder */}
      <View style={styles.infoRow}>
        <Text style={styles.label}>Anreise:</Text>
        <View style={styles.value}>
          <Text style={styles.text}>
            Nutzen Sie die Freie Fahrt im Vorarlberger Verkehrsverbund!
            Schüler:innen und Lehrlinge können gemeinsam mit den Begleitpersonen
            im Klassenverband unterwegs sein und die Kulturlandschaft
            Vorarlbergs erkunden. Genaueres unter{" "}
            <Text style={styles.link}>
              double-check.at/forderung/freie-fahrt-zur-kultur
            </Text>
            .
          </Text>
        </View>
      </View>

      {/* Cancellation / contact */}
      <Text style={styles.text}>
        Sofern Sie den gebuchten Termin nicht wahrnehmen können, bitten wir Sie,
        mind. einen Werktag (Mo-Fr) vor dem Termin mit uns Kontakt aufzunehmen.
        Für Stornierungen am Führungstag wird der Gesamtbetrag in Rechnung
        gestellt. Sollten Sie sich zu dem von Ihnen gebuchten Termin verspäten,
        geben Sie uns bitte unter der unten angeführten Telefonnummer +43 5576
        73989-20 Bescheid.
      </Text>

      <Text style={{ marginTop: 20, marginBottom: 6, fontSize: 12 }}>
        Mit herzlichem Gruß
      </Text>
      <Text style={{ fontSize: 12 }}>{currentUserName}</Text>
      <Text style={{ fontSize: 12 }}>Sekretariat/Administration</Text>

      {/* Contact Section */}
      <View style={styles.contactSection}>
        <Text style={styles.bold}>{organization.name}</Text>
        <Text>Schweizer Straße 5</Text>
        <Text>6845 Hohenems</Text>
        <Text>+43 (0)5576 73989</Text>
        {organization.email && (
          <Text style={styles.link}>{organization.email}</Text>
        )}
        {organization.details?.website && (
          <Text style={styles.link}>{organization.details.website}</Text>
        )}
        <Text>UID: ATU 37926303</Text>

        <Text style={{ marginTop: 10, fontWeight: "bold" }}>
          Öffnungszeiten
        </Text>
        <Text>Museum und Café: Di bis SO und an Feiertagen 10-17 Uhr</Text>
        <Text>Bibliothek: Di bis FR 10-12 und 14-16 Uhr</Text>
        <Text>Büro: Di bis FR 9-12 und 14-16 Uhr</Text>
      </View>

      {/* Footer */}
      <BookingFooter organization={organization} />
    </Page>
  );
};
