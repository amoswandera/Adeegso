from rest_framework import serializers
from .models import Product
from apps.accounts.serializers import VendorSerializer


class ProductSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    vendor_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = ["id", "vendor", "vendor_id", "name", "description", "price", "stock", "active", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        vendor_id = validated_data.pop('vendor_id', None)
        if vendor_id is not None:
            validated_data['vendor_id'] = vendor_id
        else:
            # Default to the authenticated vendor if available
            request = self.context.get('request')
            user = getattr(request, 'user', None)
            try:
                if user and user.is_authenticated and hasattr(user, 'vendor'):
                    validated_data['vendor_id'] = user.vendor.id
            except Exception:
                pass
        return super().create(validated_data)
