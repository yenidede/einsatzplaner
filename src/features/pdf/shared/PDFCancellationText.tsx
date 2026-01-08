import React from 'react';
import { Text } from '@react-pdf/renderer';
import { commonStyles } from '../styles/common-styles';

export const PDFCancellationText: React.FC = () => {
  return (
    <Text style={commonStyles.text}>
      Sofern Sie den gebuchten Termin nicht wahrnehmen können, bitten wir Sie,
      mind. einen Werktag (Mo-Fr) vor dem Termin mit uns Kontakt aufzunehmen.
      Für Stornierungen am Führungstag wird der Gesamtbetrag in Rechnung
      gestellt. Sollten Sie sich zu dem von Ihnen gebuchten Termin verspäten,
      geben Sie uns bitte unter der unten angeführten Telefonnummer +43 5576
      73989-20 Bescheid.
    </Text>
  );
};
