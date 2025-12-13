import { StyleSheet } from "@react-pdf/renderer";

export const commonStyles = StyleSheet.create({
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
});
