import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  rooms = {};

  joinRoom(orderNo: string, clientId: string) {
    //TODO
    console.log(orderNo, clientId);
  }
}
