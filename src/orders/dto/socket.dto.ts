export class NewMessagePayload {
  orderNo: string;
  storeId: string;
  body: string;
  sender: {
    type: 'OM' | 'PWA';
    name: string;
  };
}

export type SenderType = 'OM' | 'PWA';

export class Sender {
  type: SenderType;
  name: string;
}

export class Message {
  id: string;
  body: string;
  sender: Sender;
}

export class Conversation {
  orderNo: string;
  messages: Message[];
}

export class UpdateOrderDto {
  payload: {
    storeId: string;
    orderNo: string;
    body: {
      status: string;
      reason?: string;
      additionalReason?: string;
    };
  };
}
