import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderFloatingTabBar,
  DEFAULT_TAB_INACTIVITY_MS,
  type FloatingTabId,
} from '../../../src/ui/components/FloatingTabBar';

class MockClassList {
  private classes = new Set<string>();

  constructor(initialClassString = '') {
    initialClassString
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => this.classes.add(c));
  }

  add(...tokens: string[]): void {
    tokens.forEach((t) => this.classes.add(t));
  }

  remove(...tokens: string[]): void {
    tokens.forEach((t) => this.classes.delete(t));
  }

  contains(token: string): boolean {
    return this.classes.has(token);
  }
}

class MockElement {
  public classList: MockClassList;
  public offsetWidth = 100;
  private attrs = new Map<string, string>();
  private listeners = new Map<string, Set<() => void>>();

  constructor(initialClasses = '', initialAttrs: Record<string, string> = {}) {
    this.classList = new MockClassList(initialClasses);
    Object.entries(initialAttrs).forEach(([k, v]) => this.attrs.set(k, v));
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    this.listeners.get(type)?.forEach((fn) => fn());
  }
}

class MockContainer {
  private _innerHTML = '';
  public dockEl = new MockElement();
  public buttons = new Map<FloatingTabId, MockElement>();

  set innerHTML(html: string) {
    this._innerHTML = html;
    this.dockEl = new MockElement('floating-dock glass-dock');
    this.buttons.clear();

    const tabs: FloatingTabId[] = ['map', 'chat', 'profile'];
    for (const tab of tabs) {
      const btnRegex = new RegExp(
        `data-tab="${tab}"[\\s\\S]*?class="([^"]+)"`,
        'm'
      );
      const match = html.match(btnRegex);
      const classAttr = match ? match[1] : 'dock-tab-btn';
      const attrs: Record<string, string> = { 'data-tab': tab };
      if (html.includes(`data-tab="${tab}"`) && classAttr.includes('dock-tab-btn--active')) {
        attrs['aria-current'] = 'page';
      }
      this.buttons.set(tab, new MockElement(classAttr, attrs));
    }
  }

  get innerHTML(): string {
    return this._innerHTML;
  }

  querySelector(selector: string): MockElement | null {
    if (selector === '#floating-tab-dock') {
      return this.dockEl;
    }
    const tabMatch = selector.match(/data-tab="(map|chat|profile)"/);
    if (tabMatch) {
      return this.buttons.get(tabMatch[1] as FloatingTabId) ?? null;
    }
    return null;
  }

  querySelectorAll(selector: string): MockElement[] {
    if (selector === '.dock-tab-btn') {
      return Array.from(this.buttons.values());
    }
    return [];
  }
}

describe('FloatingTabBar (DS-NAV-DOCK)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('se empequeñece a solo logotipos tras 4 segundos (4000ms) de inactividad y se reexpande al tocar', () => {
    const container = new MockContainer();
    const cleanup = renderFloatingTabBar(container as unknown as HTMLElement, {
      activeTab: 'map',
    });

    expect(DEFAULT_TAB_INACTIVITY_MS).toBe(4000);
    expect(container.dockEl.classList.contains('floating-dock--compact')).toBe(false);

    // A los 3.9 segundos todavía sigue expandido con textos
    vi.advanceTimersByTime(3900);
    expect(container.dockEl.classList.contains('floating-dock--compact')).toBe(false);

    // Al llegar a los 4 segundos sin tocarse, se empequeñece dejando solo los 3 logotipos
    vi.advanceTimersByTime(100);
    expect(container.dockEl.classList.contains('floating-dock--compact')).toBe(true);

    // Al tocar el dock, vuelve a expandirse y reinicia la cuenta de 4 segundos
    container.dockEl.dispatch('pointerdown');
    expect(container.dockEl.classList.contains('floating-dock--compact')).toBe(false);

    vi.advanceTimersByTime(3999);
    expect(container.dockEl.classList.contains('floating-dock--compact')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(container.dockEl.classList.contains('floating-dock--compact')).toBe(true);

    cleanup();
  });

  it('navega a la pestaña seleccionada y gestiona el clic en la pestaña activa', () => {
    const container = new MockContainer();
    let navigatedTo: FloatingTabId | null = null;
    const onActiveClick = vi.fn();

    const cleanup = renderFloatingTabBar(container as unknown as HTMLElement, {
      activeTab: 'map',
      onNavigateTab: (tab) => {
        navigatedTo = tab;
      },
      onActiveTabClick: onActiveClick,
    });

    container.buttons.get('map')!.dispatch('click');
    expect(onActiveClick).toHaveBeenCalledTimes(1);
    expect(navigatedTo).toBeNull();

    container.buttons.get('chat')!.dispatch('click');
    expect(navigatedTo).toBe('chat');

    cleanup();
  });
});
