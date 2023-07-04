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
import {
  Conversation,
  NewMessagePayload,
  UpdateOrderStatusPayload,
} from './dto/socket.dto';

@WebSocketGateway({
  namespace: '/socket',
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Record<string, Set<string>> = {}; // To track the clients in each room

  private chatDatabase: Record<string, Conversation[]> = {}; // In memory chat database

  constructor(private readonly ordersService: OrdersService) {}

  @SubscribeMessage('join-room')
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
  }

  @SubscribeMessage('leave-rooms')
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
  }

  @SubscribeMessage('update-order-status')
  updateOrderStatus(@MessageBody() data: UpdateOrderStatusPayload) {
    this.server.to(data.storeId).emit('update-order-status', data);
    this.server.to(data.orderNo).emit('update-order-status', data);
  }

  @SubscribeMessage('new-message')
  newMessage(@MessageBody() data: NewMessagePayload) {
    const newMsg = { ...data, id: new Date().toISOString() };

    if (this.chatDatabase[data.storeId]) {
      // Store conversation exist

      const orderConversation = this.chatDatabase[data.storeId]?.find(
        (conversation: Conversation) => conversation.orderNo === data.orderNo,
      );

      if (orderConversation) {
        // Order Conversation Exists
        this.chatDatabase[data.storeId]
          .find(
            (conversation: Conversation) =>
              conversation.orderNo === data.orderNo,
          )
          .messages.push(newMsg);
      } else {
        // Order Conversation does not exist, create one.
        this.chatDatabase[data.storeId].push({
          orderNo: data.orderNo,
          messages: [newMsg],
        });
      }
    } else {
      // Store Conversation Not Found, create one.
      this.chatDatabase[data.storeId] = [];
      this.chatDatabase[data.storeId].push({
        orderNo: data.orderNo,
        messages: [newMsg],
      });
    }

    this.server.to(data.storeId).emit('new-message', newMsg);
    this.server.to(data.orderNo).emit('new-message', newMsg);
  }

  @SubscribeMessage('get-order-conversation')
  getOrderConversation(
    @MessageBody() data: { orderNo: string; storeId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const storeConversations = this.chatDatabase[data.storeId] ?? [];
    const orderConversation =
      storeConversations.find(
        (conversation: Conversation) => conversation.orderNo === data.orderNo,
      )?.messages ?? [];
    this.server.to(client.id).emit('get-order-conversation', orderConversation);
  }

  @SubscribeMessage('get-store-conversations')
  getStoreConversations(
    @MessageBody('storeId') storeId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const storeConversations = this.chatDatabase[storeId] ?? [];
    this.server
      .to(client.id)
      .emit('get-store-conversations', storeConversations);
  }

  handleDisconnect(client: Socket) {
    this.leaveAllRooms(client);
  }
}
