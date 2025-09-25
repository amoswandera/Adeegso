from channels.generic.websocket import AsyncJsonWebsocketConsumer


class OrdersConsumer(AsyncJsonWebsocketConsumer):
    group_name = "orders"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        # event: { 'type': 'broadcast', 'payload': {...} }
        await self.send_json(event.get("payload", {}))


class OrderDetailConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.group_name = f"order_{self.order_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        await self.send_json(event.get("payload", {}))
