import React from "react";
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { BookingFooter } from "./BookingFooter";
import type { Einsatz } from "@/features/einsatz/types";
import { OrganizationForPDF } from "@/features/organization/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 11 },
  header: { alignItems: "flex-end", marginBottom: 30 },
  logo: { width: 120, height: 60, objectFit: "contain" },
  greeting: { marginBottom: 15 },
  text: { marginBottom: 12, lineHeight: 1.5 },
  infoBox: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    marginVertical: 20,
    borderRadius: 4,
  },
  infoRow: { flexDirection: "row", marginBottom: 8 },
  label: { width: 150, fontWeight: "bold", fontSize: 10 },
  value: { flex: 1, fontSize: 10 },
  highlight: {
    backgroundColor: "#fff3cd",
    padding: 10,
    marginVertical: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  bold: { fontWeight: "bold" },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    fontSize: 10,
  },
  link: { color: "#0066cc", textDecoration: "underline" },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerColumn: { flex: 1, marginRight: 20 },
  footerTitle: { fontWeight: "bold", marginBottom: 4 },
  footerText: { marginBottom: 2 },
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

type EinsatzCategory = {
  id: string;
  value: string | null;
  abbreviation: string | null;
};

type PDFOptions = {
  showLogos?: boolean;
};

type BookingConfirmationPDFProps = {
  einsatz: Einsatz;
  einsatzCategories: EinsatzCategory[];
  organization: OrganizationForPDF;
  assignedUsers: AssignedUser[];
  options?: PDFOptions;
};

export const BookingConfirmationPDF: React.FC<BookingConfirmationPDFProps> = ({
  einsatz,
  einsatzCategories,
  organization,
  assignedUsers = [],
  options,
}) => {
  const { showLogos = true } = options || {};

  const isSchule = einsatzCategories.some((category) =>
    category.value?.toLowerCase().includes("schule")
  );

  const participantCount = einsatz.participant_count ?? "xx";

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

  const pricePerPerson =
    einsatz.price_per_person?.toFixed(2) ?? (isSchule ? "3,50" : "9,00");
  const totalPrice = einsatz.total_price?.toFixed(2) ?? "90,00";

  const orgName = organization?.name ?? "Jüdisches Museum Hohenems";
  const logoUrl = organization?.logo_url ?? null;

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      {showLogos && logoUrl && (
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
        </View>
      )}

      {/* Content */}
      <Text style={styles.greeting}>Sehr geehrte Damen und Herren,</Text>
      <Text style={styles.text}>
        gerne bestätigen wir Ihnen die Buchung einer Führung im {orgName}:
      </Text>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Gruppe:</Text>
          <View style={styles.value}>
            <Text style={styles.bold}>{isSchule ? "Schule" : "Gruppe"}</Text>
            <Text>
              {isSchule
                ? `${participantCount} Schüler*innen, x. Schulstufe`
                : `${participantCount} Erwachsene / Senioren`}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Zeit:</Text>
          <View style={styles.value}>
            <Text style={styles.bold}>{formatDate(einsatz.start)}</Text>
            <Text>
              {formatTime(einsatz.start)} – {formatTime(einsatz.end)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Programm:</Text>
          <Text style={[styles.value, styles.bold]}>{einsatz.title}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Vermittlung:</Text>
          <Text style={styles.value}>{assignedUserNames}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Kosten:</Text>
          <Text style={styles.value}>
            € {pricePerPerson}/Person
            {isSchule && ", unter 10 Personen € 35,00 Pauschale"}
            {!isSchule && `, unter 10 Personen € ${totalPrice} Pauschale`}
          </Text>
        </View>
      </View>

      <View style={styles.highlight}>
        <Text style={styles.bold}>
          Wir bitten Sie, den gesamten Betrag vorher einzusammeln.{"\n"}
        </Text>
        <Text>
          Einzel-Zahlungen sind nicht möglich! Auf Wunsch lassen wir Ihnen auch
          gerne eine Rechnung zukommen.
        </Text>
      </View>

      {isSchule && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.bold}>Anreise:</Text>
          <Text style={styles.text}>
            Nutzen Sie die Freie Fahrt im Vorarlberger Verkehrsverbund!
            Schüler:innen und Lehrlinge können gemeinsam mit den Begleitpersonen
            im Klassenverband unterwegs sein.{"\n"}
            Genaueres unter{" "}
            <Text style={styles.link}>
              double-check.at/forderung/freie-fahrt-zur-kultur
            </Text>
          </Text>
        </View>
      )}

      <Text style={styles.text}>
        Sofern Sie den gebuchten Termin nicht wahrnehmen können, bitten wir Sie,
        mind. einen Werktag (Mo-Fr) vor dem Termin mit uns Kontakt aufzunehmen.
        Für Stornierungen am Führungstag wird der Gesamtbetrag in Rechnung
        gestellt.
      </Text>

      <Text style={{ marginTop: 20, marginBottom: 5 }}>
        Mit herzlichem Gruß
      </Text>
      <Text>Martina Steiner</Text>
      <Text>Sekretariat/Administration</Text>

      <View style={styles.footer} fixed>
        <View style={styles.footerRow}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerTitle}>Kontakt</Text>
            <Text style={styles.footerText}>{organization.name}</Text>
            {organization.email && (
              <Text style={styles.footerText}>{organization.email}</Text>
            )}
            {organization.phone && (
              <Text style={styles.footerText}>{organization.phone}</Text>
            )}
            {organization.details?.website && (
              <Text style={styles.footerText}>
                {organization.details.website}
              </Text>
            )}
          </View>
        </View>
      </View>

      <BookingFooter organization={organization} />
    </Page>
  );
};
