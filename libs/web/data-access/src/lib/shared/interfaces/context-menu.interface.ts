export interface ContextMenuConfig {
  mode: 'static' | 'dynamic';
  event: MouseEvent;
  anchorElement: HTMLElement;
  offset?: {
    x?: number;
    y?: number;
  };
}

export interface ContextMenuOption {
  label: string;
  icon?: string;
  extra?: string;
  disabled?: boolean;
  action: () => void;
}
