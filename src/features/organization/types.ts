export type OrganizationBasicVisualize = {
  id: string;
  name: string;
  logo_url: string | null;
};
export type OrganizationAddress = {
  id: string;
  org_id: string;
  label: string | null;
  street: string;
  postal_code: bigint;
  city: string;
  country: string;
};

export type OrganizationBankAccount = {
  id: string;
  org_id: string;
  bank_name: string;
  iban: string;
  bic: string;
};

export type OrganizationDetails = {
  id: string;
  org_id: string;
  website: string | null;
  vat: string | null;
  zvr: string | null;
  authority: string | null;
};

export type OrganizationForPDF = {
  id: string;
  name: string;
  logo_url: string | null;
  email: string | null; // furthermore change nullable to non-nullable in future in the database as email should not be nullable
  phone: string | null;

  addresses: {
    label: string | null;
    street: string;
    postal_code: bigint;
    city: string;
    country: string;
  }[];

  bankAccounts: {
    bank_name: string;
    iban: string;
    bic: string;
  }[];

  details: {
    website: string | null;
    vat: string | null;
    zvr: string | null;
    authority: string | null;
  } | null;
};
