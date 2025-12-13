import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { commonStyles } from "../styles/common-styles";

export const PDFAnreiseInfo: React.FC = () => {
  return (
    <View style={commonStyles.infoRow}>
      <Text style={commonStyles.label}>Anreise:</Text>
      <View style={commonStyles.value}>
        <Text style={commonStyles.text}>
          Nutzen Sie die Freie Fahrt im Vorarlberger Verkehrsverbund!
          Schüler:innen und Lehrlinge können gemeinsam mit den Begleitpersonen
          im Klassenverband unterwegs sein und die Kulturlandschaft Vorarlbergs
          erkunden. Genaueres unter{" "}
          <Text style={commonStyles.link}>
            double-check.at/forderung/freie-fahrt-zur-kultur
          </Text>
          .
        </Text>
      </View>
    </View>
  );
};
