export class UpdateOrderDto {
  roomId: string;
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
