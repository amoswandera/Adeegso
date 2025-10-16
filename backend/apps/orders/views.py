from django.shortcuts import render
from rest_framework import viewsets, permissions, decorators, response, status
from django.db import transaction
from .models import Order, OrderItem, OrderEvent
from .serializers import OrderSerializer
from apps.accounts.permissions import IsVendor, IsRider, IsAdmin, IsVendorOrRiderOrAdmin
from apps.catalog.models import Product
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.accounts.models import Rider
from django.utils import timezone


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

    @decorators.action(detail=False, methods=['post'])
    def set_online_status(self, request):
        """Set rider online/offline status"""
        try:
            rider = Rider.objects.get(user=request.user)
        except Rider.DoesNotExist:
            return response.Response({"detail": "Rider profile not found"}, status=status.HTTP_404_NOT_FOUND)

        is_online = request.data.get('is_online')
        if isinstance(is_online, bool):
            if is_online:
                rider.go_online()
            else:
                rider.go_offline()
            return response.Response({"detail": f"Rider set to {'online' if is_online else 'offline'}"})
        else:
            return response.Response({"detail": "is_online must be a boolean"}, status=status.HTTP_400_BAD_REQUEST)


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
            # Log initial event
            OrderEvent.objects.create(order=order, status=order.status, note="Order created")
            # Broadcast to orders list and order detail channels
            channel_layer = get_channel_layer()
            payload = {"kind": "order_created", "order_id": order.id, "status": order.status}
            
            # Broadcast to all relevant channels
            groups = ["orders", f"order_{order.id}", "admin_dashboard"]
            for group in groups:
                async_to_sync(channel_layer.group_send)(
                    group, {"type": "broadcast", "payload": payload}
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
                    "kind": "rider_assignment",
                    "order_id": order.id,
                    "status": order.status,
                    "rider_id": assigned_rider.id
                }

                # Send to rider's personal channel
                async_to_sync(channel_layer.group_send)(
                    f"rider_{assigned_rider.id}",
                    {"type": "broadcast", "payload": rider_payload}
                )

        order.save(update_fields=["status", "rider", "updated_at"])

        # Log status change
        OrderEvent.objects.create(order=order, status=new_status, note="Status updated")

        # Broadcast update
        channel_layer = get_channel_layer()
        payload = {"kind": "order_status", "order_id": order.id, "status": order.status}

        # Broadcast to all relevant channels
        groups = ["orders", f"order_{order.id}", "admin_dashboard"]
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group, {"type": "broadcast", "payload": payload}
            )

        return response.Response(OrderSerializer(order).data)
