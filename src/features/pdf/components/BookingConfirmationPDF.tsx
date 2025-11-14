import React from "react";
import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { BookingFooter } from "./BookingFooter";
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user";

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
  contact: { fontSize: 8, color: "#666", marginTop: 10, lineHeight: 1.6 },
  link: { color: "#0066cc", textDecoration: "underline" },
});

interface Props {
  einsatz: any;
  assignedUsers?: Array<{ firstname: string; lastname: string }>;
  options?: { showLogos?: boolean };
}

export const BookingConfirmationPDF: React.FC<Props> = ({
  einsatz,
  assignedUsers = [],
  options,
}) => {
  const { showLogos = true } = options || {};

  const isSchule = einsatz?.einsatz_to_category?.some((etc: any) =>
    etc.einsatz_category?.value?.toLowerCase().includes("schule")
  );

  const user = getUserByIdWithOrgAndRole(einsatz.assigned_users[0]).then(
    (user) => {
      console.log("User Daten:", user);
    }
  );

  const participantCount =
    einsatz?.participant_count ||
    einsatz?.participants ||
    einsatz?.number_of_participants ||
    "xx";

  // Vermittlung: Namen aus übergebenen User-Daten
  const assignedUserNames =
    assignedUsers.length > 0
      ? assignedUsers.map((u) => `${u.firstname} ${u.lastname}`).join(", ")
      : einsatz?.assigned_users?.length > 0
      ? `${user.firstname} ${user.lastname}`
      : "Wird noch bekannt gegeben";

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " Uhr";

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      {showLogos && einsatz.organization?.logo_url && (
        <View style={styles.header}>
          <Image src={einsatz.organization.logo_url} style={styles.logo} />
        </View>
      )}

      {/* Content */}
      <Text style={styles.greeting}>Sehr geehrte,</Text>
      <Text style={styles.text}>
        gerne bestätigen wir Ihnen die Buchung einer Führung im{" "}
        {einsatz.organization?.name || "Jüdischen Museum"}:
      </Text>

      {/* Info Box */}
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
          {/* TODO (Ömer): Anrede abklären, da keine definiert in der DB3 */}
          <Text style={styles.value}>{assignedUserNames}</Text>
          {/*             {getUserByIdWithOrgAndRole(einsatz.assigned_users[0]).then(user => (
              <Text style={styles.value}>
                {user ? `${user.firstname} ${user.lastname}` : 'Wird noch bekannt gegeben'}
              </Text>
            ))} */}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Kosten:</Text>
          <Text style={styles.value}>
            €{" "}
            {einsatz.price_per_person?.toFixed(2) ||
              (isSchule ? "3,50" : "9,00")}
            /Person
            {isSchule && ", unter 10 Personen € 35,00 Pauschale"}
            {!isSchule &&
              `, unter 10 Personen € ${
                einsatz.total_price?.toFixed(2) || "90,00"
              } Pauschale`}
          </Text>
        </View>
      </View>

      {/* Highlight */}
      <View style={styles.highlight}>
        <Text style={styles.bold}>
          Wir bitten Sie, den gesamten Betrag vorher einzusammeln.{"\n"}
        </Text>
        <Text>
          Einzel-Zahlungen sind nicht möglich! Auf Wunsch lassen wir Ihnen auch
          gerne eine Rechnung zukommen.
        </Text>
      </View>

      {/* Anreise (nur für Schule) */}
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

      {/* Stornierung */}
      <Text style={styles.text}>
        Sofern Sie den gebuchten Termin nicht wahrnehmen können, bitten wir Sie,
        mind. einen Werktag (Mo-Fr) vor dem Termin mit uns Kontakt aufzunehmen.
        Für Stornierungen am Führungstag wird der Gesamtbetrag in Rechnung
        gestellt.
      </Text>

      {/* Signature */}
      <Text style={{ marginTop: 20, marginBottom: 5 }}>
        Mit herzlichem Gruß
      </Text>
      <Text>Martina Steiner</Text>
      <Text>Sekretariat/Administration</Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.bold}>
          {einsatz.organization?.name || "Jüdisches Museum Hohenems"}
        </Text>
        <Text>Schweizer Straße 5</Text>
        <Text>6845 Hohenems</Text>
        <Text>+43 (0)5576 73989</Text>
        <Text style={styles.link}>
          {einsatz.organization?.email || "office@jm-hohenems.at"}
        </Text>
        <Text style={styles.link}>
          {einsatz.organization?.website || "www.jm-hohenems.at"}
        </Text>
        <Text>UID: ATU 3792 6303</Text>
      </View>

      <BookingFooter />
    </Page>
  );
};
