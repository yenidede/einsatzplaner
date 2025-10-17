interface TemplateData {
  einsatz: any;
  options?: {
    showLogos?: boolean;
    showContactInfo?: boolean;
    includeTerms?: boolean;
  };
}

export function generateBookingConfirmationHtml(data: TemplateData): string {
  const { einsatz, options } = data;
  const isSchule = einsatz?.categories?.some((cat: any) => 
    cat.value?.toLowerCase().includes('schule')
  );

  return isSchule ? generateSchuleTemplate(einsatz, options) : generateGruppeTemplate(einsatz, options);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('de-DE', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

function getBaseStyles(): string {
  return  `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
    .header { text-align: right; margin-bottom: 30px; }
    .logo { max-width: 120px; }
    .greeting { margin-bottom: 20px; }
    p { margin-bottom: 15px; }
    .info-box { margin: 20px 0; padding: 15px; background: #f8f9fa; }
    .info-row { display: grid; grid-template-columns: 180px 1fr; margin-bottom: 8px; }
    .info-label { font-weight: bold; }
    .highlight { background: #fff3cd; padding: 10px; margin: 15px 0; border-left: 4px solid #ffc107; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
    .contact { font-size: 11px; color: #666; line-height: 1.8; }
    .link { color: #0066cc; text-decoration: underline; }
  `;
}

function getHeader(einsatz: any, showLogos: boolean): string {
  return showLogos && einsatz.organization?.logo_url 
    ? `<div class="header"><img src="${einsatz.organization.logo_url}" class="logo" alt="Logo"></div>`
    : '';
}

function getFooter(einsatz: any): string {
  return `
    <div class="footer">
      <strong>${einsatz.organization?.name || 'Jüdisches Museum Hohenems'}</strong><br>
      Schweizer Straße 5<br>6845 Hohenems<br>+43 (0)5576 73989<br>
      <span class="link">${einsatz.organization?.email || 'office@jm-hohenems.at'}</span><br>
      <span class="link">${einsatz.organization?.website || 'www.jm-hohenems.at'}</span><br>
      UID: ATU 3792 6303
    </div>
    <div class="contact">
      ${einsatz.organization?.name || 'Jüdisches Museum Hohenems'} | Villa Heimann-Rosenthal | Schweizer Straße 5 | Aron-Tänzer-Platz 1 | 6845 Hohenems | Österreich<br>
      T +43 (0)5576 73 989-0 | office@jm-hohenems.at | www.jm-hohenems.at | Bankkaufmannschaft Dornbirn ZVR 204991443 | UID ATU 37926303<br>
      Dornbirner Sparkasse IBAN AT71 2060 2004 0004 9911 | BIC DOSPAT2DXXX | Postfinance Schweiz IBAN CH15 0900 0000 8067 8678 | BIC POFICHBEXXX
    </div>
  `;
}

function generateSchuleTemplate(einsatz: any, options?: any): string {
  const showLogos = options?.showLogos ?? true;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><style>${getBaseStyles()}</style></head>
<body>
  ${getHeader(einsatz, showLogos)}
  <div class="greeting">Sehr geehrte,</div>
  <p>gerne bestätigen wir Ihnen die Buchung einer Führung im ${einsatz.organization?.name || 'Jüdischen Museum'}:</p>
  
  <div class="info-box">
    <div class="info-row"><div class="info-label">Gruppe:</div><div><strong>Schule</strong><br>${einsatz.helpers_needed || 'xx'} Schüler*innen, x. Schulstufe</div></div>
    <div class="info-row"><div class="info-label">Zeit:</div><div><strong>${formatDate(einsatz.start)}</strong><br>${formatTime(einsatz.start)} – ${formatTime(einsatz.end)}</div></div>
    <div class="info-row"><div class="info-label">Programm:</div><div><strong>${einsatz.title}</strong></div></div>
    <div class="info-row"><div class="info-label">Vermittlung:</div><div>Frau ${einsatz.user?.firstname || 'N/A'} ${einsatz.user?.lastname || 'N/A'}</div></div>
    <div class="info-row"><div class="info-label">Kosten:</div><div>€ ${einsatz.price_per_person?.toFixed(2) || '3,50'}/Person bzw. € ${einsatz.total_price?.toFixed(2) || '35,00'} Pauschale bei weniger als 10 Teilnehmer:innen</div></div>
  </div>

  <div class="highlight"><strong>Wir bitten Sie, den gesamten Betrag vorher einzusammeln.</strong><br>Einzel-Zahlungen sind nicht möglich! Auf Wunsch lassen wir Ihnen auch gerne eine Rechnung zukommen.</div>
  
  <p><strong>Anreise:</strong><br>Nutzen Sie die Freie Fahrt im Vorarlberger Verkehrsverbund! Schüler:innen und Lehrlinge können gemeinsam mit den Begleitpersonen im Klassenverband unterwegs sein und die Kulturlandschaft Vorarlbergs erkunden.<br>Genaueres unter <span class="link">double-check.at/forderung/freie-fahrt-zur-kultur</span></p>
  
  <p>Sofern Sie den gebuchten Termin nicht wahrnehmen können, bitten wir Sie, <strong>mind. einen Werktag (Mo-Fr) vor dem Termin</strong> mit uns Kontakt aufzunehmen. Für Stornierungen am Führungstag wird der Gesamtbetrag in Rechnung gestellt. Sollten Sie sich zu dem von Ihnen gebuchten Termin verspäten, geben Sie unserem Besucherservice bitte unter der Telefonnummer +43 5576 73989-20 Bescheid.</p>
  
  <p>Mit herzlichem Gruß<br>Martina Steiner<br>Sekretariat/Administration</p>
  ${getFooter(einsatz)}
</body>
</html>`;
}

function generateGruppeTemplate(einsatz: any, options?: any): string {
  const showLogos = options?.showLogos ?? true;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><style>${getBaseStyles()}</style></head>
<body>
  ${getHeader(einsatz, showLogos)}
  <div class="greeting">Sehr geehrte,</div>
  <p>gerne bestätigen wir Ihnen die Buchung einer Führung im ${einsatz.organization?.name || 'Jüdischen Museum'}:</p>
  
  <div class="info-box">
    <div class="info-row"><div class="info-label">Gruppe:</div><div><strong>Gruppe</strong><br>xx Erwachsene / Senioren</div></div>
    <div class="info-row"><div class="info-label">Zeit:</div><div><strong>${formatDate(einsatz.start)}</strong><br>${formatTime(einsatz.start)} – ${formatTime(einsatz.end)}</div></div>
    <div class="info-row"><div class="info-label">Programm:</div><div><strong>${einsatz.title}</strong></div></div>
    <div class="info-row"><div class="info-label">Vermittlung:</div><div>Frau ${einsatz.user?.firstname || 'Eva'} ${einsatz.user?.lastname || 'Obwegeser'}</div></div>
    <div class="info-row"><div class="info-label">Kosten:</div><div>€ ${einsatz.price_per_person?.toFixed(2) || '9,00'}/Person, unter 10 Personen fällt eine Pauschale von € ${einsatz.total_price?.toFixed(2) || '90,00'} an.</div></div>
  </div>

  <div class="highlight"><strong>Wir bitten Sie, den gesamten Betrag vorher einzusammeln.</strong><br>Einzel-Zahlungen sind nicht möglich! Auf Wunsch lassen wir Ihnen auch gerne eine Rechnung zukommen.</div>
  
  <p>Sofern Sie den gebuchten Termin nicht wahrnehmen können, bitten wir Sie, <strong>mind. einen Werktag (Mo-Fr) vor dem Termin</strong> mit uns Kontakt aufzunehmen. Für Stornierungen am Führungstag wird der Gesamtbetrag in Rechnung gestellt. Sollten Sie sich zu dem von Ihnen gebuchten Termin verspäten, geben Sie unserem Besucherservice bitte unter der Telefonnummer +43 5576 73989-20 Bescheid.</p>
  
  <p>Mit herzlichem Gruß<br>Martina Steiner<br>Sekretariat/Administration</p>
  ${getFooter(einsatz)}
</body>
</html>`;
}