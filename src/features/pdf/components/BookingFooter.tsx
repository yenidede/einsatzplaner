import React from 'react';
import {  Text , StyleSheet} from '@react-pdf/renderer';
const styles = StyleSheet.create({
  contact: { fontSize: 8, color: '#666', marginTop: 10, lineHeight: 1.6 },
});
export const BookingFooter: React.FC = () => {
    return (
        <Text style={styles.contact}>
          { 'Jüdisches Museum Hohenems'} | Villa Heimann-Rosenthal | Schweizer Straße 5 | Aron-Tänzer-Platz 1 | 6845 Hohenems | Österreich{'\n'}
          T +43 (0)5576 73 989-0 | office@jm-hohenems.at | www.jm-hohenems.at | UID ATU 37926303{'\n'}
          Dornbirner Sparkasse IBAN AT71 2060 2004 0004 9911 | BIC DOSPAT2DXXX
        </Text>
    );
}