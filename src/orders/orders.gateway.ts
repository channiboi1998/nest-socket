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
  UpdateOrderDto,
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

  private chatDatabase: Record<string, Conversation[]> = {};

  constructor(private readonly ordersService: OrdersService) {}

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
  }

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
  }

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
  }

  @SubscribeMessage('updateOrderStatus')
  updateOrderStatus(@MessageBody() data: UpdateOrderDto) {
    this.server
      .to(data.payload.storeId)
      .emit('updateOrderStatus', data.payload);
    this.server
      .to(data.payload.orderNo)
      .emit('updateOrderStatus', data.payload);
  }

  @SubscribeMessage('newMessage')
  newMessage(@MessageBody() data: NewMessagePayload) {
    const newMsg = { ...data, id: new Date().toISOString() };

    if (this.chatDatabase[data.storeId]) {
      // Store Conversation Exist
      const orderConversation = this.chatDatabase[data.storeId]?.find(
        (conversation: Conversation) => conversation.orderNo === data.orderNo,
      );

      if (orderConversation) {
        this.chatDatabase[data.storeId]
          .find(
            (conversation: Conversation) =>
              conversation.orderNo === data.orderNo,
          )
          .messages.push(newMsg);
      } else {
        this.chatDatabase[data.storeId].push({
          orderNo: data.orderNo,
          messages: [newMsg],
        });
      }
    } else {
      // Store Conversation Not Found, Create one.
      this.chatDatabase[data.storeId] = [];
      this.chatDatabase[data.storeId].push({
        orderNo: data.orderNo,
        messages: [newMsg],
      });
    }

    this.server.to(data.storeId).emit('newMessage', newMsg);
    this.server.to(data.orderNo).emit('newMessage', newMsg);
  }

  @SubscribeMessage('getOrderConversation')
  getOrderConversation(
    @MessageBody() data: { orderNo: string; storeId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const storeConversations = this.chatDatabase[data.storeId] ?? [];
    const orderConversation =
      storeConversations.find(
        (conversation: Conversation) => conversation.orderNo === data.orderNo,
      )?.messages ?? [];
    this.server.to(client.id).emit('getOrderConversation', orderConversation);
  }

  @SubscribeMessage('getStoreConversations')
  getStoreConversations(
    @MessageBody('storeId') storeId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const storeConversations = this.chatDatabase[storeId] ?? [];
    this.server.to(client.id).emit('getStoreConversations', storeConversations);
  }

  handleDisconnect(client: Socket) {
    this.leaveAllRooms(client);
  }
}
