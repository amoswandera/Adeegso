from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AdminDashboardConsumer(AsyncJsonWebsocketConsumer):
    group_name = "admin_dashboard"

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        # Handle the new message format
        message_data = event
        message_type = message_data.get("type")

        if message_type == "analytics_update":
            await self.send_json({
                "type": "analytics_update",
                "data": message_data.get("data")
            })
        elif message_type == "order_created":
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
        else:
            # Fallback for other message types
            await self.send_json(message_data)
