import { describe, it, expect } from 'vitest';
import reducer, {
  setHuddleParticipants,
  selectRoomHuddleParticipants,
  setUnreadNotification,
  clearUnreadNotification,
  selectHasUnreadNotification,
} from './unifiedChatSlice';

describe('unifiedChatSlice', () => {
  const getFreshState = () => reducer(undefined, { type: '@@INIT' });

  it('should initialize with empty state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.rooms).toEqual({});
    expect(state.unreadNotifications).toEqual({});
    expect(state.isConnected).toBe(false);
    expect(state.globalOnlineUsers).toEqual([]);
  });

  it('should handle setHuddleParticipants and selectRoomHuddleParticipants', () => {
    const participants = [
      { id: 1, name: 'Alice', avatar: 'https://example.com/avatar1.png' },
      { id: 2, name: 'Bob', avatar: 'https://example.com/avatar2.png' },
    ];

    const state = reducer(
      getFreshState(),
      setHuddleParticipants({
        roomId: 42,
        participants,
      })
    );

    const rootState = {
      unifiedChat: state,
    } as any;

    const selected = selectRoomHuddleParticipants(rootState, 42);
    expect(selected).toEqual(participants);
    expect(selected.length).toBe(2);
    expect(selected[0].name).toBe('Alice');
  });

  it('should handle unread notifications lifecycle', () => {
    let state = reducer(getFreshState(), setUnreadNotification(10));
    let rootState = { unifiedChat: state } as any;

    expect(selectHasUnreadNotification(rootState, 10)).toBe(true);
    expect(selectHasUnreadNotification(rootState, 99)).toBe(false);

    state = reducer(state, clearUnreadNotification(10));
    rootState = { unifiedChat: state } as any;
    expect(selectHasUnreadNotification(rootState, 10)).toBe(false);
  });
});
