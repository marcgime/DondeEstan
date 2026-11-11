/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: 'var(--color-surface-canvas)',
          base: 'var(--color-surface-base)',
          elevated: 'var(--color-surface-elevated)',
          inset: 'var(--color-surface-inset)',
          highest: 'var(--color-surface-highest)',
          overlay: 'var(--color-surface-overlay)',
          glass: 'var(--color-surface-glass)',
          'glass-border': 'var(--color-surface-glass-border)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          disabled: 'var(--color-text-disabled)',
          'on-accent': 'var(--color-text-on-accent)',
          accent: 'var(--color-text-accent)',
          inverse: 'var(--color-text-inverse)',
        },
        brand: {
          primary: 'var(--color-accent-primary)',
          'primary-container': 'var(--color-accent-primary-container)',
          'on-primary': 'var(--color-accent-on-primary)',
          'on-primary-container': 'var(--color-accent-on-primary-container)',
          secondary: 'var(--color-accent-secondary)',
          'secondary-container': 'var(--color-accent-secondary-container)',
          'on-secondary': 'var(--color-accent-on-secondary)',
          'on-secondary-container': 'var(--color-accent-on-secondary-container)',
          tertiary: 'var(--color-accent-tertiary)',
          'tertiary-container': 'var(--color-accent-tertiary-container)',
          'on-tertiary': 'var(--color-accent-on-tertiary)',
          'on-tertiary-container': 'var(--color-accent-on-tertiary-container)',
        },
        status: {
          online: 'var(--color-status-online)',
          offline: 'var(--color-status-offline)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
        },
      },
      borderRadius: {
        'sm': '8px',
        'DEFAULT': '16px',
        'md': '24px',
        'lg': '32px',
        'xl': '48px',
        'full': '9999px',
        'pebble': '40px 24px 40px 40px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'dock': 'var(--shadow-dock)',
        'alert': 'var(--shadow-alert)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

