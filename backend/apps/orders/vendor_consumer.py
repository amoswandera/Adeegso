import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from apps.accounts.models import Account


class VendorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope["user"]

        # Check if user is authenticated and is a vendor
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        try:
            account = await database_sync_to_async(lambda: self.user.account)()
            if account.role != Account.Role.VENDOR:
                await self.close()
                return
        except Account.DoesNotExist:
            await self.close()
            return

        # Accept the connection
        await self.accept()

        # Add to vendor group
        await self.channel_layer.group_add(
            f"vendor_{self.user.id}",
            self.channel_name
        )

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Remove from vendor group
        if hasattr(self, 'user') and not self.user.is_anonymous:
            await self.channel_layer.group_discard(
                f"vendor_{self.user.id}",
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)

            # Handle authentication
            if data.get('type') == 'auth':
                token = data.get('token')
                if token:
                    # In a real implementation, you'd verify the token
                    # For now, just acknowledge
                    await self.send(text_data=json.dumps({
                        'type': 'auth_success',
                        'message': 'Authenticated successfully'
                    }))

            # Handle ping
            elif data.get('type') == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    async def order_created(self, event):
        """Send order created notification to vendor"""
        await self.send(text_data=json.dumps({
            "type": "order_created",
            "order": event['order']
        }))

    async def order_updated(self, event):
        """Send order updated notification to vendor"""
        await self.send(text_data=json.dumps({
            "type": "order_updated",
            "order": event['order']
        }))

    async def order_status_changed(self, event):
        """Send order status changed notification to vendor"""
        await self.send(text_data=json.dumps({
            "type": "order_status_changed",
            "order_id": event['order_id'],
            "status": event['status']
        }))
