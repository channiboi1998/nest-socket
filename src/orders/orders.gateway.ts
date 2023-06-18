import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OrdersService } from './orders.service';
import { Server, Socket } from 'socket.io';
import { UpdateOrderDto } from './dto/updateOrderStatus.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Record<string, Set<string>> = {}; // To track the clients in each room

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Handles the 'joinRoom' event in a NestJS application using WebSockets.
   * Joins a client socket to a specified room and updates the 'rooms' object.
   *
   * @param roomId - The ID of the room to join
   * @param client - The connected socket object
   * @returns void
   */
  @SubscribeMessage('joinRoom')
  joinRoom(
    @MessageBody('roomId') roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (roomId) {
      client.join(roomId);

      if (!this.rooms[roomId]) {
        this.rooms[roomId] = new Set<string>();
      }
      this.rooms[roomId].add(client.id);
    }
    console.log(this.rooms);
  }

  /**
   * Handles the 'leaveRoom' event in a NestJS application using WebSockets.
   * Removes a client socket from a specified room and updates the 'rooms' object.
   *
   * @param roomId - The ID of the room to leave
   * @param client - The connected socket object
   * @returns void
   */
  @SubscribeMessage('leaveRoom')
  leaveRoom(
    @MessageBody('roomId') roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(roomId);

    if (this.rooms[roomId] && this.rooms[roomId].has(client.id)) {
      this.rooms[roomId].delete(client.id);
      if (this.rooms[roomId].size === 0) {
        delete this.rooms[roomId];
      }
    }
    console.log(this.rooms);
  }

  /**
   * Handles the 'leaveAllRooms' event in a NestJS application using WebSockets.
   * Removes a client socket from all rooms it is currently joined to.
   *
   * @param client - The connected socket object
   * @returns void
   */
  @SubscribeMessage('leaveAllRooms')
  leaveAllRooms(@ConnectedSocket() client: Socket) {
    for (const roomId in this.rooms) {
      if (this.rooms[roomId].has(client.id)) {
        client.leave(roomId);
        this.rooms[roomId].delete(client.id);
        if (this.rooms[roomId].size === 0) {
          delete this.rooms[roomId];
        }
        break;
      }
    }
    console.log(this.rooms);
  }

  /**
   * Handles the 'updateOrderStatus' event in a NestJS application using WebSockets.
   * Updates the order status for a specific order and emits the updated status to the respective rooms and order number.
   *
   * @param data - The data containing the order ID, room ID, and the updated order status payload
   * @returns void
   */
  @SubscribeMessage('updateOrderStatus')
  updateOrderStatus(@MessageBody() data: UpdateOrderDto) {
    this.server
      .to(data.payload.storeId)
      .emit('updateOrderStatus', data.payload);
    this.server
      .to(data.payload.orderNo)
      .emit('updateOrderStatus', data.payload);
  }

  /**
   * Handles the 'disconnect' event in a NestJS application using WebSockets.
   * Removes the client from all rooms.
   *
   * @param client - The disconnected socket object
   * @returns void
   */
  handleDisconnect(client: Socket) {
    // Remove the client from the corresponding room
    this.leaveAllRooms(client);
    console.log(this.rooms);
  }
}
