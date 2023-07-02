export interface NewMessagePayload {
  orderNo: string;
  storeId: string;
  body: string;
  sender: {
    type: 'OM' | 'PWA';
    name: string;
  };
}

export type SenderType = 'OM' | 'PWA';

export interface Sender {
  type: SenderType;
  name: string;
}

export interface Message {
  id: string;
  body: string;
  sender: Sender;
}

export interface Conversation {
  orderNo: string;
  messages: Message[];
}

export interface UpdateOrderStatusPayload {
  storeId: string;
  orderNo: string;
  body: {
    status: string;
    reason?: string;
    additionalReason?: string;
  };
}
