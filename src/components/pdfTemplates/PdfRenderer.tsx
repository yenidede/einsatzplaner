import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { PdfTemplateContent, PdfViewModel } from '@/types/pdfTemplate';
import { interpolateText } from '@/utils/pdfInterpolation';

const styles = StyleSheet.create({
  page: { padding: 30 },
  text: { fontSize: 12, marginBottom: 10 },
  table: { marginBottom: 10 },
  tableRow: { flexDirection: 'row', marginBottom: 5 },
  tableLabel: { width: '30%', fontWeight: 'bold' },
  tableValue: { width: '70%' },
  spacer: { height: 10 },
  signature: { marginTop: 20, fontSize: 12 },
});

interface PdfRendererProps {
  content: PdfTemplateContent;
  viewModel: PdfViewModel;
}

export function PdfRenderer({ content, viewModel }: PdfRendererProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {content.blocks.map((block) => {
          switch (block.type) {
            case 'text':
              return (
                <Text key={block.id} style={styles.text}>
                  {interpolateText(block.data.content, viewModel)}
                </Text>
              );
            case 'infoTable':
              return (
                <View key={block.id} style={styles.table}>
                  {block.data.rows.map((row: any, i: any) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={styles.tableLabel}>{row.label}:</Text>
                      <Text style={styles.tableValue}>
                        {interpolateText(row.value, viewModel)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            case 'spacer':
              return (
                <View key={block.id} style={{ height: block.data.height }} />
              );
            case 'signature':
              return (
                <Text key={block.id} style={styles.signature}>
                  {interpolateText(block.data.text, viewModel)}
                </Text>
              );
            case 'presetNotice':
              return (
                <Text key={block.id} style={styles.text}>
                  {block.data.notice}
                </Text>
              );
            default:
              return null;
          }
        })}
      </Page>
    </Document>
  );
}
