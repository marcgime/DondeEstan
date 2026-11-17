import { describe, it, expect } from 'vitest';
import type { MemberLocationState } from '@/location/types';

describe('Member Selection Logic for Split Map View', () => {
  const dummyMembers: MemberLocationState[] = [
    {
      uid: 'user-1',
      display_name: 'Papá',
      email: 'papa@familia.local',
      role: 'admin',
      status: 'online',
      isLive: true,
      location: { lat: 41.56, lng: 2.01, updated_at: 1000 },
      relativeTimeText: 'En línea',
    },
    {
      uid: 'user-2',
      display_name: 'Mamá',
      email: 'mama@familia.local',
      role: 'member',
      status: 'online',
      isLive: true,
      location: { lat: 41.57, lng: 2.02, updated_at: 1000 },
      relativeTimeText: 'En línea',
    },
    {
      uid: 'user-3',
      display_name: 'Hijo',
      email: 'hijo@familia.local',
      role: 'member',
      status: 'offline',
      isLive: false,
      relativeTimeText: 'Hace 2h',
    },
  ];

  function filterVisibleMembers(
    members: MemberLocationState[],
    showAll: boolean,
    selectedUids: Set<string>
  ): MemberLocationState[] {
    if (showAll) {
      return members;
    }
    return members.filter((m) => selectedUids.has(m.uid));
  }

  it('debe devolver todos los miembros cuando showAll es true', () => {
    const selected = new Set<string>(['user-1']);
    const result = filterVisibleMembers(dummyMembers, true, selected);
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.uid)).toEqual(['user-1', 'user-2', 'user-3']);
  });

  it('debe filtrar exclusivamente los miembros seleccionados cuando showAll es false', () => {
    const selected = new Set<string>(['user-1', 'user-2']);
    const result = filterVisibleMembers(dummyMembers, false, selected);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.uid)).toEqual(['user-1', 'user-2']);
  });

  it('debe permitir seleccionar y deseleccionar miembros dinámicamente', () => {
    const selected = new Set<string>(['user-1']);
    // toggle user-2
    selected.add('user-2');
    expect(filterVisibleMembers(dummyMembers, false, selected)).toHaveLength(2);

    // toggle off user-1
    selected.delete('user-1');
    const result = filterVisibleMembers(dummyMembers, false, selected);
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('user-2');
  });

  it('debe devolver array vacío si showAll es false y ningún usuario está marcado', () => {
    const selected = new Set<string>();
    const result = filterVisibleMembers(dummyMembers, false, selected);
    expect(result).toHaveLength(0);
  });
});
