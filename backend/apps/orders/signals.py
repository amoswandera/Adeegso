import json
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone


@receiver(post_save, sender='orders.Order')
def broadcast_order_updates(sender, instance, created, **kwargs):
    """Broadcast WebSocket updates when orders are created or updated"""
    from .models import Order
    from .serializers import OrderSerializer

    channel_layer = get_channel_layer()

    try:
        order_data = OrderSerializer(instance).data

        if created:
            # Broadcast order creation to all relevant parties
            broadcast_order_creation(channel_layer, instance, order_data)
        else:
            # Broadcast order updates to all relevant parties
            broadcast_order_update(channel_layer, instance, order_data)

    except Exception as e:
        # Log error but don't break the save operation
        print(f"Error broadcasting order update: {e}")


def broadcast_order_creation(channel_layer, order, order_data):
    """Broadcast order creation to all relevant parties"""
    from .models import Order

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

    # Broadcast to admin dashboard for analytics update
    async_to_sync(channel_layer.group_send)(
        "admin_dashboard",
        {
            "type": "analytics_update",
            "data": {
                "orders_today": Order.objects.filter(created_at__date=order.created_at.date()).count(),
                "total_orders": Order.objects.count(),
                "new_order": order_data
            }
        }
    )


def broadcast_order_update(channel_layer, order, order_data):
    """Broadcast order updates to all relevant parties"""
    from .models import Order

    # Broadcast status change to customer
    async_to_sync(channel_layer.group_send)(
        f"customer_{order.customer.id}",
        {
            "type": "order_status_changed",
            "order_id": order.id,
            "status": order.status
        }
    )

    # Broadcast order update to vendor
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

    # Broadcast to admin dashboard for analytics update
    async_to_sync(channel_layer.group_send)(
        "admin_dashboard",
        {
            "type": "analytics_update",
            "data": {
                "status_counts": {
                    status: Order.objects.filter(status=status).count()
                    for status, _ in Order.Status.choices
                },
                "updated_order": order_data
            }
        }
    )
