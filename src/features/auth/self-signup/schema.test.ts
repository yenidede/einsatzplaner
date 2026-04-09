import { describe, expect, it } from 'vitest';
import {
  createFormSchema,
  selfSignupBaseSchema,
} from '@/features/auth/self-signup/schema';

function createValidBaseData() {
  return {
    'orga-name': 'Jüdisches Museum Hohenems',
    'orga-kuerzel': 'JMH',
    'orga-phone': '+436601234567',
    'orga-website': 'https://www.jm-hohenems.at',
    'user-vorname': 'David',
    'user-nachname': 'Kathrein',
    'user-email': 'david@example.com',
    'user-password': 'geheimespasswort',
    'user-passwort-confirm': 'geheimespasswort',
    'privacy-consent': true,
    'orga-logo-gross': undefined,
    'orga-logo-klein': undefined,
    'orga-helfer-singular': 'Vermittler:in',
    'orga-helfer-plural': 'Vermittler:innen',
    'orga-einsatz-singular': 'Führung',
    'orga-einsatz-plural': 'Führungen',
    'user-profilbild': undefined,
  };
}

describe('selfSignupBaseSchema', () => {
  it('normalisiert gültige Telefonnummern in E.164', () => {
    const result = selfSignupBaseSchema.safeParse(createValidBaseData());

    expect(result.success).toBe(true);
    expect(result.data?.['orga-phone']).toBe('+436601234567');
  });
});

describe('createFormSchema', () => {
  it('fordert im neuen Konto alle benötigten Benutzerdaten an', () => {
    const result = createFormSchema('new').safeParse({
      ...createValidBaseData(),
      'user-vorname': '',
      'user-nachname': '',
      'user-email': '',
      'user-password': '',
      'user-passwort-confirm': '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors).toMatchObject({
      'user-vorname': ['Der Vorname ist erforderlich'],
      'user-nachname': ['Der Nachname ist erforderlich'],
      'user-email': ['Die E-Mail-Adresse ist erforderlich'],
      'user-password': ['Das Passwort ist erforderlich'],
      'user-passwort-confirm': ['Die Passwortbestätigung ist erforderlich'],
    });
  });

  it('verlangt bei bestehendem Konto nur E-Mail und Passwort', () => {
    const result = createFormSchema('existing').safeParse({
      ...createValidBaseData(),
      'user-vorname': '',
      'user-nachname': '',
      'user-passwort-confirm': '',
      'user-email': '',
      'user-password': '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors).toMatchObject({
      'user-email': ['Die E-Mail-Adresse ist erforderlich'],
      'user-password': ['Das Passwort ist erforderlich'],
    });
    expect(result.error?.flatten().fieldErrors['user-vorname']).toBeUndefined();
    expect(result.error?.flatten().fieldErrors['user-passwort-confirm']).toBeUndefined();
  });

  it('meldet zu kurze und nicht übereinstimmende Passwörter sauber zurück', () => {
    const result = createFormSchema('new').safeParse({
      ...createValidBaseData(),
      'user-password': 'kurz',
      'user-passwort-confirm': 'anders',
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors).toMatchObject({
      'user-password': ['Das Passwort muss mindestens 8 Zeichen lang sein.'],
      'user-passwort-confirm': [
        'Das Passwort muss mindestens 8 Zeichen lang sein.',
        'Die Passwörter stimmen nicht überein.',
      ],
    });
  });

  it('akzeptiert eingeloggte Benutzer ohne Kontofelder', () => {
    const result = createFormSchema('logged_in').safeParse({
      ...createValidBaseData(),
      'user-vorname': '',
      'user-nachname': '',
      'user-email': '',
      'user-password': '',
      'user-passwort-confirm': '',
    });

    expect(result.success).toBe(true);
  });
});
