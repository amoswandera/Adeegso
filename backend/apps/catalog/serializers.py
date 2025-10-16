from rest_framework import serializers
from .models import Product
from apps.accounts.serializers import VendorSerializer


class ProductSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    vendor_id = serializers.IntegerField(write_only=True, required=False)
    approved_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "vendor", "vendor_id", "name", "description", "price", "category", "stock",
            "image", "active", "approval_status", "approved_by", "approved_at", "rejection_reason",
            "created_at", "updated_at"
        ]
        read_only_fields = ["created_at", "updated_at", "approved_at"]

    def create(self, validated_data):
        # Don't override vendor_id if it's already provided by the ViewSet
        vendor_id = validated_data.pop('vendor_id', None)
        if vendor_id is not None:
            validated_data['vendor_id'] = vendor_id

        return super().create(validated_data)
