import { describe, expect, it } from 'vitest';
import { RoomManager } from '../../src/game/RoomManager';
import { RoomStatus } from '@shared/types/room';

function seedRoom(manager: RoomManager) {
  const room = manager.createRoom('p1', 'Alice', '');
  expect(manager.joinRoom(room.roomCode, 'p2', 'Bob', '').success).toBe(true);
  expect(manager.joinRoom(room.roomCode, 'p3', 'Cara', '').success).toBe(true);
  return room.roomCode;
}

describe('RoomManager', () => {
  it('creates unique room codes and seats joined players in order', () => {
    const manager = new RoomManager();
    const roomCode = seedRoom(manager);
    const room = manager.getRoom(roomCode)!;

    expect(room.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(room.players.map(player => player.seatIndex)).toEqual([0, 1, 2]);
    expect(room.players.map(player => player.id)).toEqual(['p1', 'p2', 'p3']);
    expect(room.status).toBe(RoomStatus.WAITING);
  });

  it('prevents a user from occupying multiple rooms', () => {
    const manager = new RoomManager();
    const firstRoom = manager.createRoom('p1', 'Alice', '');

    expect(() => manager.createRoom('p1', 'Alice', '')).toThrow('already in a room');
    const secondRoom = manager.createRoom('p2', 'Bob', '');
    const blockedJoin = manager.joinRoom(secondRoom.roomCode, 'p1', 'Alice', '');
    expect(blockedJoin.success).toBe(false);
    expect(blockedJoin.existingRoom?.roomCode).toBe(firstRoom.roomCode);
    expect(manager.getUserRoom('p1')).toBe(firstRoom.roomCode);
  });

  it('removes waiting-room players on explicit leave and preserves seat ordering', () => {
    const manager = new RoomManager();
    const roomCode = seedRoom(manager);

    const result = manager.leaveRoom('p2');
    expect(result?.roomCode).toBe(roomCode);
    expect(result?.room?.players.map(player => player.id)).toEqual(['p1', 'p3']);
    expect(result?.room?.players.map(player => player.seatIndex)).toEqual([0, 1]);
  });

  it('preserves game state, seat, and hand across disconnect and rejoin', () => {
    const manager = new RoomManager();
    const roomCode = seedRoom(manager);
    const started = manager.startGame(roomCode, 'p1');
    expect(started.success).toBe(true);

    const game = started.game!;
    const handBefore = game.getClientState('p2').myHand.map(card => card.id);
    const p2SeatBefore = manager.getRoom(roomCode)!.players.find(player => player.id === 'p2')!.seatIndex;

    const disconnect = manager.disconnectUser('p2');
    expect(disconnect?.gameInProgress).toBe(true);
    expect(manager.getRoom(roomCode)!.players.find(player => player.id === 'p2')?.isConnected).toBe(false);
    expect(game.getClientState('p1').players.find(player => player.id === 'p2')?.isConnected).toBe(false);

    const rejoin = manager.joinRoom(roomCode, 'p2', 'Bobby', 'avatar-2.png');
    expect(rejoin.success).toBe(true);
    expect(manager.getRoom(roomCode)!.players.find(player => player.id === 'p2')?.seatIndex).toBe(p2SeatBefore);
    expect(manager.getRoom(roomCode)!.players.find(player => player.id === 'p2')?.isConnected).toBe(true);
    expect(manager.getRoom(roomCode)!.players.find(player => player.id === 'p2')?.name).toBe('Bobby');
    expect(manager.getRoom(roomCode)!.players.find(player => player.id === 'p2')?.avatar).toBe('avatar-2.png');
    expect(game.getClientState('p2').myHand.map(card => card.id)).toEqual(handBefore);
  });

  it('blocks game start until all seated players are connected', () => {
    const manager = new RoomManager();
    const roomCode = seedRoom(manager);

    manager.disconnectUser('p3');

    const started = manager.startGame(roomCode, 'p1');
    expect(started.success).toBe(false);
    expect(started.error).toContain('connected');
  });
});
