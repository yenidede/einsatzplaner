export type MenuSeparator = { type: "separator"; inset?: boolean };

export type MenuLabel = {
    type: "label";
    text: string;
    inset?: boolean;
};

export type MenuItem = {
    type: "item";
    text: string;
    inset?: boolean;
    shortcut?: string;
    disabled?: boolean;
    variant?: "default" | "destructive";
    onSelect?: () => void | Promise<void>;
};

export type MenuCheckbox = {
    type: "checkbox";
    text: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void | Promise<void>;
    inset?: boolean;
};

export type MenuRadioGroup = {
    type: "radio-group";
    label?: string;
    value: string;
    onValueChange?: (value: string) => void | Promise<void>;
    items: Array<{ value: string; text: string }>;
    insetLabel?: boolean;
};

export type MenuSub = {
    type: "sub";
    text: string;
    inset?: boolean;
    content: MenuNode[];
    className?: string;
};

export type MenuNode =
    | MenuSeparator
    | MenuLabel
    | MenuItem
    | MenuCheckbox
    | MenuRadioGroup
    | MenuSub;