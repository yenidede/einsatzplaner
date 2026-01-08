import React from 'react';
import { Text } from '@react-pdf/renderer';

type PDFSignatureProps = {
  userName: string;
};

export const PDFSignature: React.FC<PDFSignatureProps> = ({ userName }) => {
  return (
    <>
      <Text style={{ marginTop: 20, marginBottom: 6, fontSize: 12 }}>
        Mit herzlichem Gruß
      </Text>
      <Text style={{ fontSize: 12 }}>{userName}</Text>
      <Text style={{ fontSize: 12 }}>Sekretariat/Administration</Text>
    </>
  );
};
