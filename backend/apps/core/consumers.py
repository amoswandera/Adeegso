import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from apps.orders.models import Order, OrderEvent
from apps.payments.models import Payment
from apps.accounts.models import Account


class AdminDashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time admin dashboard updates"""

    async def connect(self):
        # Add to admin dashboard group
        await self.channel_layer.group_add("admin_dashboard", self.channel_name)
        await self.accept()

        # Send initial analytics data on connection
        await self.send_initial_analytics()

    async def disconnect(self, close_code):
        # Remove from admin dashboard group
        await self.channel_layer.group_discard("admin_dashboard", self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'refresh_analytics':
                await self.send_initial_analytics()
            elif message_type == 'get_detailed_analytics':
                await self.send_detailed_analytics(data.get('date_range', 'today'))

        except json.JSONDecodeError:
            pass

    async def broadcast(self, event):
        """Handle broadcast messages from the channel layer"""
        message_data = event
        message_type = message_data.get("type")

        if message_type == "analytics_update":
            await self.send(text_data=json.dumps({
                "type": "analytics_update",
                "data": message_data.get("data")
            }))
        elif message_type == "order_created":
            await self.send(text_data=json.dumps({
                "type": "order_created",
                "order": message_data.get("order")
            }))
        elif message_type == "order_status_changed":
            await self.send(text_data=json.dumps({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            }))
        else:
            # Fallback for other message types
            await self.send(text_data=json.dumps(message_data))

    async def send_initial_analytics(self):
        """Send initial analytics summary to connected clients"""
        try:
            today = timezone.now().date()
            start_of_day = timezone.datetime.combine(today, timezone.datetime.min.time(), tzinfo=timezone.get_current_timezone())
            end_of_day = timezone.datetime.combine(today, timezone.datetime.max.time(), tzinfo=timezone.get_current_timezone())

            # Today's orders
            orders_today = Order.objects.filter(created_at__date=today)
            orders_today_count = orders_today.count()
            gmv_today = orders_today.aggregate(total=Sum('total_amount'))['total'] or 0

            # Orders by status
            status_counts = {}
            for status, _ in Order.Status.choices:
                status_counts[status] = Order.objects.filter(status=status).count()

            # Last 7 days data
            last_7_days = []
            for i in range(6, -1, -1):
                date = today - timedelta(days=i)
                count = Order.objects.filter(created_at__date=date).count()
                last_7_days.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'count': count
                })

            # Recent activity (last 10 events)
            recent_events = []
            order_events = OrderEvent.objects.select_related('order').order_by('-created_at')[:10]
            for event in order_events:
                recent_events.append({
                    'type': 'order',
                    'id': event.order.id,
                    'timestamp': event.created_at.isoformat(),
                    'description': f'Order #{event.order.id} {event.status}',
                    'status': event.status
                })

            payment_events = Payment.objects.select_related('order').order_by('-created_at')[:5]
            for payment in payment_events:
                recent_events.append({
                    'type': 'payment',
                    'id': payment.id,
                    'timestamp': payment.created_at.isoformat(),
                    'description': f'Payment {payment.provider} - {payment.status}',
                    'amount': float(payment.amount),
                    'status': payment.status
                })

            # Sort by timestamp
            recent_events.sort(key=lambda x: x['timestamp'], reverse=True)

            analytics_data = {
                'type': 'analytics_update',
                'data': {
                    'orders_today': orders_today_count,
                    'gmv_today': float(gmv_today),
                    'status_counts': status_counts,
                    'last_7_days': last_7_days[:7],
                    'recent_activity': recent_events[:10],
                    'total_orders': Order.objects.count(),
                    'total_revenue': float(Order.objects.aggregate(total=Sum('total_amount'))['total'] or 0),
                    'total_users': Order.objects.values('customer').distinct().count(),
                    'active_vendors': Order.objects.values('vendor').distinct().count()
                }
            }

            await self.send(text_data=json.dumps(analytics_data))

        except Exception as e:
            error_data = {
                'type': 'error',
                'message': 'Failed to load analytics data',
                'error': str(e)
            }
            await self.send(text_data=json.dumps(error_data))

    async def send_detailed_analytics(self, date_range):
        """Send detailed analytics for specific date range"""
        try:
            today = timezone.now().date()

            if date_range == 'today':
                start_date = today
                end_date = today
            elif date_range == 'yesterday':
                yesterday = today - timedelta(days=1)
                start_date = yesterday
                end_date = yesterday
            elif date_range == 'last_7_days':
                start_date = today - timedelta(days=6)
                end_date = today
            elif date_range == 'last_30_days':
                start_date = today - timedelta(days=29)
                end_date = today
            else:
                start_date = today
                end_date = today

            # Get orders in date range
            orders = Order.objects.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)

            # Revenue by day
            revenue_by_day = []
            current_date = start_date
            while current_date <= end_date:
                day_orders = orders.filter(created_at__date=current_date)
                day_revenue = day_orders.aggregate(total=Sum('total_amount'))['total'] or 0
                day_count = day_orders.count()

                revenue_by_day.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'revenue': float(day_revenue),
                    'orders': day_count
                })
                current_date += timedelta(days=1)

            # Top vendors by revenue
            top_vendors = orders.values('vendor__name').annotate(
                revenue=Sum('total_amount'),
                order_count=Count('id')
            ).order_by('-revenue')[:10]

            # Payment method breakdown
            payment_methods = Payment.objects.filter(
                order__created_at__date__gte=start_date,
                order__created_at__date__lte=end_date
            ).values('provider').annotate(
                count=Count('id'),
                total_amount=Sum('amount')
            ).order_by('-total_amount')

            detailed_data = {
                'type': 'detailed_analytics',
                'date_range': date_range,
                'data': {
                    'revenue_by_day': revenue_by_day,
                    'top_vendors': list(top_vendors),
                    'payment_methods': list(payment_methods),
                    'total_orders': orders.count(),
                    'total_revenue': float(orders.aggregate(total=Sum('total_amount'))['total'] or 0),
                    'average_order_value': float(orders.aggregate(avg=Sum('total_amount') / Count('id'))['avg'] or 0)
                }
            }

            await self.send(text_data=json.dumps(detailed_data))

        except Exception as e:
            error_data = {
                'type': 'error',
                'message': 'Failed to load detailed analytics',
                'error': str(e)
            }
            await self.send(text_data=json.dumps(error_data))


class BaseOrderConsumer(AsyncWebsocketConsumer):
    """Base WebSocket consumer for order-related updates"""

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from authentication token"""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth.models import User
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            # Get the associated account if it exists
            try:
                account = user.account
                # Add role information to user object
                user.role = account.role
                user.account_id = account.id
                return user
            except Account.DoesNotExist:
                # User doesn't have an account, assume customer role
                user.role = 'customer'
                return user
        except Exception:
            return None

    async def authenticate_and_add_to_groups(self, token):
        """Authenticate user and add to appropriate groups"""
        user = await self.get_user_from_token(token)
        if not user:
            await self.close()
            return None

        self.user = user

        # Add to general orders group
        await self.channel_layer.group_add("orders", self.channel_name)

        # Add to user-specific groups based on role
        if user.role == 'customer':
            await self.channel_layer.group_add(f"customer_{user.id}", self.channel_name)
        elif user.role == 'vendor':
            # For vendors, we need to get the vendor ID
            try:
                from apps.accounts.models import Vendor
                vendor = Vendor.objects.get(owner=user)
                await self.channel_layer.group_add(f"vendor_{vendor.id}", self.channel_name)
            except Vendor.DoesNotExist:
                pass
        elif user.role == 'rider':
            # For riders, we need to get the rider ID
            try:
                from apps.accounts.models import Rider
                rider = Rider.objects.get(user=user)
                await self.channel_layer.group_add(f"rider_{rider.id}", self.channel_name)
            except Rider.DoesNotExist:
                pass

        return user


class CustomerOrderConsumer(BaseOrderConsumer):
    """WebSocket consumer for customer order updates"""

    async def connect(self):
        await self.accept()
        # Wait for authentication message
        self.waiting_for_auth = True

    async def disconnect(self, close_code):
        if hasattr(self, 'user'):
            # Remove from groups
            await self.channel_layer.group_discard("orders", self.channel_name)
            if self.user.role == 'customer':
                await self.channel_layer.group_discard(f"customer_{self.user.id}", self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if data.get('type') == 'auth' and self.waiting_for_auth:
                token = data.get('token')
                user = await self.authenticate_and_add_to_groups(token)

                if user and user.role == 'customer':
                    self.waiting_for_auth = False
                    # Send confirmation
                    await self.send(text_data=json.dumps({
                        'type': 'auth_success',
                        'message': 'Connected successfully'
                    }))
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'auth_error',
                        'message': 'Authentication failed or user is not a customer'
                    }))
                    await self.close()

        except json.JSONDecodeError:
            pass

    async def broadcast(self, event):
        """Handle broadcast messages"""
        message_data = event
        message_type = message_data.get("type")

        if message_type == "order_created":
            await self.send(text_data=json.dumps({
                "type": "order_created",
                "order": message_data.get("order")
            }))
        elif message_type == "order_status_changed":
            await self.send(text_data=json.dumps({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            }))
        elif message_type == "order_updated":
            await self.send(text_data=json.dumps({
                "type": "order_updated",
                "order": message_data.get("order")
            }))
        else:
            # Fallback for other message types
            await self.send(text_data=json.dumps(message_data))


class VendorOrderConsumer(BaseOrderConsumer):
    """WebSocket consumer for vendor order updates"""

    async def connect(self):
        await self.accept()
        self.waiting_for_auth = True

    async def disconnect(self, close_code):
        if hasattr(self, 'user'):
            await self.channel_layer.group_discard("orders", self.channel_name)
            if self.user.role == 'vendor':
                # Get vendor ID to remove from vendor group
                try:
                    from apps.accounts.models import Vendor
                    vendor = Vendor.objects.get(owner=self.user)
                    await self.channel_layer.group_discard(f"vendor_{vendor.id}", self.channel_name)
                except Vendor.DoesNotExist:
                    pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if data.get('type') == 'auth' and self.waiting_for_auth:
                token = data.get('token')
                user = await self.authenticate_and_add_to_groups(token)

                if user and user.role == 'vendor':
                    self.waiting_for_auth = False
                    await self.send(text_data=json.dumps({
                        'type': 'auth_success',
                        'message': 'Connected successfully'
                    }))
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'auth_error',
                        'message': 'Authentication failed or user is not a vendor'
                    }))
                    await self.close()

        except json.JSONDecodeError:
            pass

    async def broadcast(self, event):
        """Handle broadcast messages"""
        message_data = event
        message_type = message_data.get("type")

        if message_type == "order_created":
            await self.send(text_data=json.dumps({
                "type": "order_created",
                "order": message_data.get("order")
            }))
        elif message_type == "order_status_changed":
            await self.send(text_data=json.dumps({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            }))
        elif message_type == "order_updated":
            await self.send(text_data=json.dumps({
                "type": "order_updated",
                "order": message_data.get("order")
            }))
        else:
            # Fallback for other message types
            await self.send(text_data=json.dumps(message_data))


class RiderOrderConsumer(BaseOrderConsumer):
    """WebSocket consumer for rider order updates"""

    async def connect(self):
        await self.accept()
        self.waiting_for_auth = True

    async def disconnect(self, close_code):
        if hasattr(self, 'user'):
            await self.channel_layer.group_discard("orders", self.channel_name)
            if self.user.role == 'rider':
                # Get rider ID to remove from rider group
                try:
                    from apps.accounts.models import Rider
                    rider = Rider.objects.get(user=self.user)
                    await self.channel_layer.group_discard(f"rider_{rider.id}", self.channel_name)
                except Rider.DoesNotExist:
                    pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if data.get('type') == 'auth' and self.waiting_for_auth:
                token = data.get('token')
                user = await self.authenticate_and_add_to_groups(token)

                if user and user.role == 'rider':
                    self.waiting_for_auth = False
                    await self.send(text_data=json.dumps({
                        'type': 'auth_success',
                        'message': 'Connected successfully'
                    }))
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'auth_error',
                        'message': 'Authentication failed or user is not a rider'
                    }))
                    await self.close()

        except json.JSONDecodeError:
            pass

    async def broadcast(self, event):
        """Handle broadcast messages"""
        message_data = event
        message_type = message_data.get("type")

        if message_type == "order_created":
            await self.send(text_data=json.dumps({
                "type": "order_created",
                "order": message_data.get("order")
            }))
        elif message_type == "order_status_changed":
            await self.send(text_data=json.dumps({
                "type": "order_status_changed",
                "order_id": message_data.get("order_id"),
                "status": message_data.get("status")
            }))
        elif message_type == "order_updated":
            await self.send(text_data=json.dumps({
                "type": "order_updated",
                "order": message_data.get("order")
            }))
        else:
            # Fallback for other message types
            await self.send(text_data=json.dumps(message_data))
