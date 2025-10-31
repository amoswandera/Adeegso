from django.shortcuts import render
from rest_framework import viewsets, permissions, decorators, response, status
from django.db import transaction
from .models import Order, OrderItem, OrderEvent
from .serializers import OrderSerializer
from apps.accounts.permissions import IsVendor, IsRider, IsAdmin, IsVendorOrRiderOrAdmin
from apps.catalog.models import Product
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.accounts.models import Rider, Wallet, WalletTransaction
from django.utils import timezone
from django.db.models import Sum, Count, Avg
from datetime import timedelta
import json


# Create your views here.


class RiderDeliveryViewSet(viewsets.ViewSet):
    """
    ViewSet for riders to manage their delivery requests and assignments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Only riders can access these endpoints
        if not hasattr(self.request.user, 'account') or self.request.user.account.role != 'rider':
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return [permissions.AllowAny()]

    def list(self, request):
        """Get available delivery requests for the rider"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get orders that are accepted by vendor but not yet assigned to a rider
        available_orders = Order.objects.filter(
            status=Order.Status.ACCEPTED,
            rider__isnull=True
        ).select_related('vendor', 'customer').prefetch_related('items')[:10]  # Limit to 10

        serializer = OrderSerializer(available_orders, many=True, context={'request': request})
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a delivery request"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            order = Order.objects.get(pk=pk, status=Order.Status.ACCEPTED, rider__isnull=True)
        except Order.DoesNotExist:
            return response.Response({"detail": "Order not available for delivery"}, status=status.HTTP_404_NOT_FOUND)

        # Assign order to rider
        order.rider = rider
        order.status = Order.Status.ASSIGNED
        order.save(update_fields=['rider', 'status', 'updated_at'])

        # Log event
        OrderEvent.objects.create(order=order, status=order.status, note="Order assigned to rider")

        # Broadcast update
        channel_layer = get_channel_layer()
        payload = {"kind": "order_status", "order_id": order.id, "status": order.status}

        groups = ["orders", f"order_{order.id}", "admin_dashboard"]
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group, {"type": "broadcast", "payload": payload}
            )

        serializer = OrderSerializer(order, context={'request': request})
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a delivery request"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            order = Order.objects.get(pk=pk, status=Order.Status.ACCEPTED, rider__isnull=True)
        except Order.DoesNotExist:
            return response.Response({"detail": "Order not available for delivery"}, status=status.HTTP_404_NOT_FOUND)

        # Log rejection event
        OrderEvent.objects.create(order=order, status=order.status, note=f"Delivery rejected by rider {rider.user.username}")

        # Broadcast update to remove from available deliveries for other riders
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "orders",
            {
                "type": "delivery_rejected",
                "order_id": order.id,
                "rider_id": rider.id,
                "message": "Delivery request rejected by rider"
            }
        )

        return response.Response({"detail": "Delivery request rejected"})

    @decorators.action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update delivery status (assigned → on_way → delivered)"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            order = Order.objects.get(pk=pk, rider=rider)
        except Order.DoesNotExist:
            return response.Response({"detail": "Order not assigned to this rider"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if new_status not in ['on_way', 'delivered']:
            return response.Response({"detail": "Invalid status for rider update"}, status=status.HTTP_400_BAD_REQUEST)

        # Update order status
        order.status = new_status
        if new_status == 'delivered':
            # Process rider earnings when delivery is completed
            rider_earning = float(order.total_amount) * 0.15  # 15% commission for rider

            # Get or create rider's wallet
            try:
                wallet = rider.wallet
            except Wallet.DoesNotExist:
                wallet = Wallet.objects.create(rider=rider, balance=0)

            # Add earnings to wallet
            wallet.balance += rider_earning
            wallet.save(update_fields=['balance'])

            # Create transaction record
            WalletTransaction.objects.create(
                wallet=wallet,
                amount=rider_earning,
                transaction_type=Wallet.TransactionType.EARNING,
                description=f"Delivery earnings for order #{order.id}",
                order=order
            )

        order.save(update_fields=['status', 'updated_at'])

        # Log event
        OrderEvent.objects.create(order=order, status=new_status, note="Status updated by rider")

        # Broadcast update
        channel_layer = get_channel_layer()
        payload = {"kind": "order_status", "order_id": order.id, "status": new_status}

        groups = ["orders", f"order_{order.id}", "admin_dashboard"]
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group, {"type": "broadcast", "payload": payload}
            )

        serializer = OrderSerializer(order, context={'request': request})
        return response.Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get details of an assigned delivery"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            order = Order.objects.get(pk=pk, rider=rider)
        except Order.DoesNotExist:
            return response.Response({"detail": "Order not assigned to this rider"}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderSerializer(order, context={'request': request})
        return response.Response(serializer.data)

    @decorators.action(detail=False, methods=['post'])
    def update_location(self, request):
        """Update rider's current location"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if latitude is None or longitude is None:
            return response.Response({"detail": "Latitude and longitude are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rider.update_location(float(latitude), float(longitude))
            return response.Response({"detail": "Location updated successfully"})
        except (ValueError, TypeError):
            return response.Response({"detail": "Invalid latitude or longitude values"}, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=False, methods=['get'])
    def my_deliveries(self, request):
        """Get rider's assigned deliveries"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get orders assigned to this rider
        my_orders = Order.objects.filter(
            rider=rider
        ).select_related('vendor', 'customer').prefetch_related('items').order_by('-created_at')

        serializer = OrderSerializer(my_orders, many=True, context={'request': request})
        return response.Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related("vendor", "rider", "customer").prefetch_related("items")
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        if self.action in ["create"]:
            return [permissions.IsAuthenticated()]
        if self.action in ["update", "partial_update", "set_status"]:
            return [IsVendorOrRiderOrAdmin()]
        if self.action in ["destroy"]:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return qs.none()
        # Admins see all
        try:
            role = getattr(user, 'account', None) and user.account.role
        except Exception:
            role = None
        # Base scoping by role
        if role == 'vendor':
            qs = qs.filter(vendor__owner=user)
        elif role == 'rider':
            qs = qs.filter(rider__user=user)
        elif role == 'admin' or user.is_superuser:
            qs = qs
        else:
            qs = qs.filter(customer=user)

        # Server-side filters
        params = self.request.query_params
        status_param = params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        from_date = params.get('from')  # ISO date YYYY-MM-DD
        to_date = params.get('to')
        if from_date:
            qs = qs.filter(created_at__date__gte=from_date)
        if to_date:
            qs = qs.filter(created_at__date__lte=to_date)
        return qs

    def create(self, request, *args, **kwargs):
        """Create an order with items and compute totals.
        Expected payload:
        { vendor: vendor_id, items: [{product: id, quantity: n}], delivery_fee? }
        """
        data = request.data
        try:
            vendor_id = int(data.get("vendor"))
            items = data.get("items", [])
        except Exception:
            return response.Response({"detail": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        if not items:
            return response.Response({"detail": "Items required"}, status=status.HTTP_400_BAD_REQUEST)
        delivery_fee = data.get("delivery_fee") or 0
        try:
            delivery_fee = float(delivery_fee)
        except Exception:
            delivery_fee = 0

        with transaction.atomic():
            order = Order.objects.create(
                customer=request.user,
                vendor_id=vendor_id,
                status=Order.Status.PENDING,
                subtotal_amount=0,
                delivery_fee=delivery_fee,
                total_amount=0,
            )
            subtotal = 0
            for item in items:
                product_id = int(item.get("product"))
                quantity = int(item.get("quantity", 1))
                if quantity <= 0:
                    transaction.set_rollback(True)
                    return response.Response({"detail": "Quantity must be positive"}, status=status.HTTP_400_BAD_REQUEST)
                product = Product.objects.select_for_update().get(id=product_id)
                price = product.price
                OrderItem.objects.create(order=order, product=product, quantity=quantity, price=price)
                subtotal += float(price) * quantity
            order.subtotal_amount = subtotal
            order.total_amount = subtotal + float(delivery_fee)
            order.save(update_fields=["subtotal_amount", "total_amount", "updated_at"])
        # Broadcast order creation
        channel_layer = get_channel_layer()
        order_data = OrderSerializer(order).data

        # Broadcast to vendor
        async_to_sync(channel_layer.group_send)(
            f"vendor_{order.vendor.id}",
            {
                "type": "order_created",
                "order": order_data
            }
        )

        # Broadcast to customer
        async_to_sync(channel_layer.group_send)(
            f"customer_{order.customer.id}",
            {
                "type": "order_created",
                "order": order_data
            }
        )

        # Broadcast to admin dashboard
        async_to_sync(channel_layer.group_send)(
            "admin_dashboard",
            {
                "type": "analytics_update",
                "data": {
                    "orders_today": Order.objects.filter(created_at__date=timezone.now().date()).count(),
                    "total_orders": Order.objects.count()
                }
            }
        )

        serializer = OrderSerializer(order)
        headers = self.get_success_headers(serializer.data)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @decorators.action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Order.Status.choices):
            return response.Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        order.status = new_status

        # If vendor is accepting an order, try to assign it to an available rider
        if new_status == Order.Status.ACCEPTED and old_status == Order.Status.PENDING:
            # Try to assign to an available rider
            # First, get verified and online riders
            available_riders = Rider.objects.filter(
                verified=True,
                is_online=True
            ).select_related('user').order_by('-last_location_update')[:10]  # Get 10 most recently active riders

            if available_riders.exists():
                # For now, assign to the most recently active rider
                # TODO: Implement location-based assignment for better optimization
                assigned_rider = available_riders.first()
                order.rider = assigned_rider
                order.status = Order.Status.ASSIGNED  # Auto-assign to rider

                # Create wallet for rider if it doesn't exist
                try:
                    wallet = assigned_rider.wallet
                except Wallet.DoesNotExist:
                    wallet = Wallet.objects.create(rider=assigned_rider, balance=0)

                # Log assignment event
                OrderEvent.objects.create(
                    order=order,
                    status=order.status,
                    note=f"Order auto-assigned to rider {assigned_rider.user.username}"
                )

                # Broadcast assignment to rider
                channel_layer = get_channel_layer()
                rider_payload = {
                    "type": "order_created",  # Rider gets full order data
                    "order": OrderSerializer(order).data
                }

                # Send to rider's personal channel
                async_to_sync(channel_layer.group_send)(
                    f"rider_{assigned_rider.id}",
                    rider_payload
                )

        order.save(update_fields=["status", "rider", "updated_at"])

        # Log status change
        OrderEvent.objects.create(order=order, status=new_status, note="Status updated")

        # Create wallet transaction if order is delivered and has a rider
        if new_status == 'delivered' and order.rider:
            try:
                from apps.accounts.models import Wallet, WalletTransaction
                # Get or create wallet for rider
                wallet, created = Wallet.objects.get_or_create(rider=order.rider)

                # Calculate rider earnings (15% of order total)
                rider_earnings = order.total_amount * 0.15

                # Create earning transaction
                WalletTransaction.objects.create(
                    wallet=wallet,
                    amount=rider_earnings,
                    transaction_type=Wallet.TransactionType.EARNING,
                    description=f"Delivery earnings for order #{order.id}",
                    order=order
                )

                # Update wallet balance
                wallet.balance += rider_earnings
                wallet.save(update_fields=['balance'])

                print(f"Created wallet transaction for rider {order.rider.user.username}: +${rider_earnings}")

            except Exception as e:
                print(f"Error creating wallet transaction: {e}")

        # Broadcast status update
        channel_layer = get_channel_layer()
        order_data = OrderSerializer(order).data

        # Broadcast to customer
        async_to_sync(channel_layer.group_send)(
            f"customer_{order.customer.id}",
            {
                "type": "order_status_changed",
                "order_id": order.id,
                "status": order.status
            }
        )

        # Broadcast to vendor
        async_to_sync(channel_layer.group_send)(
            f"vendor_{order.vendor.id}",
            {
                "type": "order_updated",
                "order": order_data
            }
        )

        # Broadcast to rider if assigned
        if order.rider:
            async_to_sync(channel_layer.group_send)(
                f"rider_{order.rider.id}",
                {
                    "type": "order_status_changed",
                    "order_id": order.id,
                    "status": order.status
                }
            )

        # Broadcast to admin dashboard
        async_to_sync(channel_layer.group_send)(
            "admin_dashboard",
            {
                "type": "analytics_update",
                "data": {
                    "status_counts": {
                        status: Order.objects.filter(status=status).count()
                        for status, _ in Order.Status.choices
                    }
                }
            }
        )

        return response.Response(OrderSerializer(order).data)


# Analytics API endpoints for admin dashboard
@decorators.api_view(['GET'])
@decorators.permission_classes([IsAdmin])
def admin_analytics_summary(request):
    """Get admin analytics summary data"""
    today = timezone.now().date()

    try:
        # Today's orders and revenue
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

        # Recent activity (last 20 events)
        recent_events = []
        order_events = OrderEvent.objects.select_related('order').order_by('-created_at')[:20]
        for event in order_events:
            recent_events.append({
                'type': 'order',
                'id': event.order.id,
                'timestamp': event.created_at.isoformat(),
                'description': f'Order #{event.order.id} {event.status}',
                'status': event.status
            })

        # Payment events (last 10)
        from apps.payments.models import Payment
        payment_events = Payment.objects.select_related('order').order_by('-created_at')[:10]
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

        # Overall statistics
        total_stats = {
            'total_orders': Order.objects.count(),
            'total_revenue': float(Order.objects.aggregate(total=Sum('total_amount'))['total'] or 0),
            'total_users': len(set(Order.objects.values_list('customer', flat=True))),
            'active_vendors': len(set(Order.objects.values_list('vendor', flat=True))),
            'active_riders': Rider.objects.filter(verified=True).count()
        }

        return response.Response({
            'orders_today': orders_today_count,
            'gmv_today': float(gmv_today),
            'status_counts': status_counts,
            'last_7_days': last_7_days,
            'recent_activity': recent_events[:10],
            'total_stats': total_stats
        })

    except Exception as e:
        return response.Response(
            {'error': 'Failed to load analytics data', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@decorators.api_view(['GET'])
@decorators.permission_classes([IsAdmin])
def admin_analytics_detailed(request):
    """Get detailed analytics for specific date range"""
    date_range = request.GET.get('range', 'today')
    today = timezone.now().date()

    try:
        # Determine date range
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
        from apps.payments.models import Payment
        payment_methods = Payment.objects.filter(
            order__created_at__date__gte=start_date,
            order__created_at__date__lte=end_date
        ).values('provider').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        ).order_by('-total_amount')

        # Vendor performance
        vendor_performance = orders.values('vendor__name').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('total_amount'),
            avg_order_value=Avg('total_amount')
        ).order_by('-total_revenue')[:10]

        return response.Response({
            'date_range': date_range,
            'revenue_by_day': revenue_by_day,
            'top_vendors': list(top_vendors),
            'payment_methods': list(payment_methods),
            'vendor_performance': list(vendor_performance),
            'total_orders': orders.count(),
            'total_revenue': float(orders.aggregate(total=Sum('total_amount'))['total'] or 0),
            'average_order_value': float(orders.aggregate(avg=Avg('total_amount'))['avg'] or 0)
        })

    except Exception as e:
        return response.Response(
            {'error': 'Failed to load detailed analytics', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
