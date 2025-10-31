from channels.generic.websocket import AsyncJsonWebsocketConsumer


class OrdersConsumer(AsyncJsonWebsocketConsumer):
    group_name = "orders"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        # Handle the new message format
        message_data = event
        message_type = message_data.get("type")

        if message_type == "order_created":
            await self.send_json({
                "type": "order_created",
                "order": message_data.get("order")
            })
        elif message_type == "order_status_changed":
            await self.send_json({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            })
        elif message_type == "order_updated":
            await self.send_json({
                "type": "order_updated",
                "order": message_data.get("order")
            })
        else:
            # Fallback for other message types
            await self.send_json(message_data)


class OrderDetailConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.group_name = f"order_{self.order_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        # Handle the new message format
        message_data = event
        message_type = message_data.get("type")

        if message_type == "order_created":
            await self.send_json({
                "type": "order_created",
                "order": message_data.get("order")
            })
        elif message_type == "order_status_changed":
            await self.send_json({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            })
        elif message_type == "order_updated":
            await self.send_json({
                "type": "order_updated",
                "order": message_data.get("order")
            })
        else:
            # Fallback for other message types
            await self.send_json(message_data)


class RiderConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.rider_id = self.scope['url_route']['kwargs']['rider_id']
        self.group_name = f"rider_{self.rider_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        # Handle the new message format
        message_data = event
        message_type = message_data.get("type")

        if message_type == "order_created":
            await self.send_json({
                "type": "order_created",
                "order": message_data.get("order")
            })
        elif message_type == "order_status_changed":
            await self.send_json({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            })
        elif message_type == "order_updated":
            await self.send_json({
                "type": "order_updated",
                "order": message_data.get("order")
            })
        else:
            # Fallback for other message types
            await self.send_json(message_data)
