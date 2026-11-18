export type UiScaleLevel = 'compact' | 'default' | 'comfortable' | 'large';

export interface UiScaleOption {
  readonly id: UiScaleLevel;
  readonly label: string;
  readonly percentage: string;
  readonly description: string;
}

export const UI_SCALE_STORAGE_KEY = 'dondeestan_ui_scale';

export const UI_SCALE_OPTIONS: readonly UiScaleOption[] = [
  {
    id: 'compact',
    label: 'Compacto',
    percentage: '100%',
    description: 'Tamaño base original',
  },
  {
    id: 'default',
    label: 'Normal',
    percentage: '108%',
    description: 'Zoom ligero (por defecto)',
  },
  {
    id: 'comfortable',
    label: 'Cómodo',
    percentage: '115%',
    description: 'Lectura más amplia',
  },
  {
    id: 'large',
    label: 'Grande',
    percentage: '122%',
    description: 'Máxima legibilidad',
  },
] as const;

const SCALE_PERCENTAGE_MAP: Record<UiScaleLevel, string> = {
  compact: '100%',
  default: '108%',
  comfortable: '115%',
  large: '122%',
};

export function isValidUiScale(value: unknown): value is UiScaleLevel {
  return (
    value === 'compact' ||
    value === 'default' ||
    value === 'comfortable' ||
    value === 'large'
  );
}

export function getUiScalePercentage(level: UiScaleLevel): string {
  return SCALE_PERCENTAGE_MAP[level] || SCALE_PERCENTAGE_MAP.default;
}

export function getStoredUiScale(): UiScaleLevel {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(UI_SCALE_STORAGE_KEY);
      if (isValidUiScale(raw)) {
        return raw;
      }
    }
  } catch (err) {
    console.warn('No se pudo leer la escala de UI desde localStorage:', err);
  }
  return 'default';
}

export function applyUiScale(level: UiScaleLevel): UiScaleLevel {
  const safeLevel: UiScaleLevel = isValidUiScale(level) ? level : 'default';
  const percentage = getUiScalePercentage(safeLevel);

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--app-font-scale', percentage);
    document.documentElement.style.fontSize = percentage;
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UI_SCALE_STORAGE_KEY, safeLevel);
    }
  } catch (err) {
    console.warn('No se pudo guardar la escala de UI en localStorage:', err);
  }

  return safeLevel;
}

export function initUiScale(): UiScaleLevel {
  const stored = getStoredUiScale();
  return applyUiScale(stored);
}
