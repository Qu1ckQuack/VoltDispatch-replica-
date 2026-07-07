import { Injectable, Logger } from '@nestjs/common';
import type { WebSocket } from 'ws';

@Injectable()
export class RoomManagerService {
  private readonly logger = new Logger(RoomManagerService.name);
  private readonly rooms = new Map<string, Set<WebSocket>>();
  private readonly clientRooms = new Map<WebSocket, Set<string>>();

  subscribe(client: WebSocket, room: string): void {
    const members = this.rooms.get(room) ?? new Set();
    members.add(client);
    this.rooms.set(room, members);

    const rooms = this.clientRooms.get(client) ?? new Set();
    rooms.add(room);
    this.clientRooms.set(client, rooms);
  }

  unsubscribe(client: WebSocket, room: string): void {
    const members = this.rooms.get(room);
    if (members) {
      members.delete(client);
      if (members.size === 0) this.rooms.delete(room);
    }
    this.clientRooms.get(client)?.delete(room);
  }

  unsubscribeAll(client: WebSocket): void {
    const rooms = this.clientRooms.get(client);
    if (!rooms) return;

    for (const room of rooms) {
      const members = this.rooms.get(room);
      if (members) {
        members.delete(client);
        if (members.size === 0) this.rooms.delete(room);
      }
    }

    rooms.clear();
  }

  getClientRooms(client: WebSocket): ReadonlySet<string> {
    return this.clientRooms.get(client) ?? new Set();
  }

  broadcast(room: string, event: string, data: Record<string, unknown>): void {
    const members = this.rooms.get(room);
    if (!members) return;

    const message = JSON.stringify({ event, data });
    for (const client of members) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }
}
