export type Organization = {
  id: string;
  name: string;
  helper_name_singular?: string;
  helper_name_plural?: string;
  hasGetMailNotification: boolean;
  roles: Array<{
    id: string;
    name: string;
    abbreviation: string | null;
  }>;
};

export type Salutation = {
  id: string;
  salutation: string;
};
