import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { commonStyles } from "../styles/common-styles";
import { Decimal } from "@/generated/prisma/runtime/library";

type PDFCostInfoProps = {
  pricePerPerson: Decimal;
  participants: number;
};

export const PDFCostInfo: React.FC<PDFCostInfoProps> = ({
  pricePerPerson,
  participants,
}) => {
  return (
    <View style={commonStyles.infoRow}>
      <Text style={commonStyles.label}>Kosten:</Text>
      <View style={commonStyles.value}>
        <Text style={commonStyles.bold}>
          € {pricePerPerson.toString().replace(".", ",")}/Person bzw. €{" "}
          {pricePerPerson.mul(participants).toString().replace(".", ",")} bei{" "}
          {participants} Teilnehmer:innen
        </Text>

        <View style={commonStyles.costInfo}>
          <Text style={commonStyles.bold}>
            Wir bitten Sie, den gesamten Betrag vorher einzusammeln.
          </Text>
          <Text style={{ marginTop: 3 }}>
            Einzel-Zahlungen sind nicht möglich! Auf Wunsch lassen wir Ihnen
            auch gerne eine Rechnung zukommen.
          </Text>
        </View>
      </View>
    </View>
  );
};
