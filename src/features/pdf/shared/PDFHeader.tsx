import React from "react";
import { View, Image } from "@react-pdf/renderer";
import { commonStyles } from "../styles/common-styles";

type PDFHeaderProps = {
  logoUrl: string | null;
  showLogos: boolean;
};

export const PDFHeader: React.FC<PDFHeaderProps> = ({ logoUrl, showLogos }) => {
  if (!showLogos || !logoUrl) return null;

  return (
    <View style={commonStyles.header}>
      <Image src={logoUrl} style={commonStyles.logo} />
    </View>
  );
};
