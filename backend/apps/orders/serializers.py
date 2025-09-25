from rest_framework import serializers
from .models import Order, OrderItem, OrderEvent
from apps.catalog.serializers import ProductSerializer
from django.contrib.auth.models import User


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "price"]


class OrderSerializer(serializers.ModelSerializer):
    customer = UserBasicSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    events = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "vendor",
            "rider",
            "status",
            "subtotal_amount",
            "delivery_fee",
            "total_amount",
            "created_at",
            "updated_at",
            "items",
            "events",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_events(self, obj):
        # Return list of {status, note, created_at}
        return [
            {"status": e.status, "note": e.note, "created_at": e.created_at}
            for e in obj.events.all().order_by("created_at")
        ]
