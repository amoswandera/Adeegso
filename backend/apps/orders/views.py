from django.shortcuts import render
from rest_framework import viewsets, permissions, decorators, response, status
from django.db import transaction
from .models import Order, OrderItem, OrderEvent
from .serializers import OrderSerializer
from apps.accounts.permissions import IsVendor, IsRider, IsAdmin, IsVendorOrRiderOrAdmin
from apps.catalog.models import Product
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


# Create your views here.


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
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        # Log status change
        OrderEvent.objects.create(order=order, status=new_status, note="Status updated")
        # Broadcast update
        channel_layer = get_channel_layer()
        payload = {"kind": "order_status", "order_id": order.id, "status": new_status}
        
        # Broadcast to all relevant channels
        groups = ["orders", f"order_{order.id}", "admin_dashboard"]
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group, {"type": "broadcast", "payload": payload}
            )
        return response.Response(OrderSerializer(order).data)
