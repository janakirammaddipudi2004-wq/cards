import { randomInt } from 'crypto';
import { ROOM_CODE_LENGTH } from '../../../shared/constants';

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CHARACTERS.charAt(randomInt(CHARACTERS.length));
  }
  return code;
}
