from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Account, Vendor, Rider, Wallet, WalletTransaction, VendorKYC, RiderKYC


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class AccountSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Account
        fields = ["id", "user", "role", "phone_number", "is_verified", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class VendorSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    owner_user_id = serializers.IntegerField(write_only=True, required=True, help_text="ID of the user who will own this vendor")

    class Meta:
        model = Vendor
        fields = [
            "id",
            "owner",
            "owner_user_id",
            "name",
            "location",
            "approved",
            "commission_rate",
            # Glovo-style metadata
            "rating",
            "rating_count",
            "discount_percent",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_owner_user_id(self, value):
        """Validate that the user exists and doesn't already own a vendor."""
        try:
            owner = User.objects.get(id=value)
            if hasattr(owner, 'vendor'):
                raise serializers.ValidationError("This user already owns a vendor")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")

    def create(self, validated_data):
        owner_user_id = validated_data.pop("owner_user_id", None)
        if owner_user_id is None:
            raise serializers.ValidationError({"owner_user_id": ["This field is required"]})
            
        try:
            owner = User.objects.get(id=owner_user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError({"owner_user_id": ["User not found"]})
            
        # Double-check in case validation was bypassed
        if Vendor.objects.filter(owner=owner).exists():
            raise serializers.ValidationError({"owner_user_id": ["This user already owns a vendor"]})
            
        # Attach owner
        validated_data["owner"] = owner
        
        # Set default values if not provided
        validated_data.setdefault('approved', False)
        validated_data.setdefault('commission_rate', 0)
        
        # Create the vendor
        vendor = Vendor.objects.create(**validated_data)
        
        # Update user's account role to vendor if an account exists
        try:
            account = owner.account
            if account.role != Account.Role.VENDOR:
                account.role = Account.Role.VENDOR
                account.save(update_fields=["role", "updated_at"])
        except Account.DoesNotExist:
            # Create an account for the user if it doesn't exist
            Account.objects.create(
                user=owner,
                role=Account.Role.VENDOR,
                phone_number=f"vendor-{owner.id}"  # Default phone number
            )
            
        return vendor

    def update(self, instance, validated_data):
        owner_user_id = validated_data.pop("owner_user_id", None)
        if owner_user_id is not None:
            try:
                owner = User.objects.get(id=owner_user_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"owner_user_id": "User not found"})
            instance.owner = owner
        return super().update(instance, validated_data)


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = serializers.ChoiceField(write_only=True, required=False, choices=Account.Role.choices)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "email",
            "first_name",
            "last_name",
            # extra account fields
            "phone_number",
            "role",
        ]

    def create(self, validated_data):
        phone_number = validated_data.pop("phone_number", None)
        role = validated_data.pop("role", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if phone_number or role:
            # Create or update related Account
            account, _ = Account.objects.get_or_create(user=user, defaults={
                "phone_number": phone_number or f"user-{user.id}",
            })
            # Ensure phone_number unique: update if provided
            if phone_number:
                account.phone_number = phone_number
            if role:
                account.role = role
            account.save()
        return user


class RiderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Rider
        fields = [
            "id", "user", "user_id", "verified", "vehicle_type", "license_plate",
            "current_latitude", "current_longitude", "last_location_update", "is_online",
            "wallet_balance", "created_at", "updated_at"
        ]
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        user_id = validated_data.pop("user_id", None)
        if user_id is not None:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({"user_id": "User not found"})
            validated_data["user"] = user
        return super().create(validated_data)

class WalletSerializer(serializers.ModelSerializer):
    rider = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Wallet
        fields = ["id", "rider", "balance", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class WalletTransactionSerializer(serializers.ModelSerializer):
    wallet = WalletSerializer(read_only=True)

    class Meta:
        model = WalletTransaction
        fields = ["id", "wallet", "amount", "transaction_type", "description", "order", "created_at"]
        read_only_fields = ["created_at"]


class VendorKYCSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    vendor_id = serializers.IntegerField(write_only=True, required=True)
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = VendorKYC
        fields = [
            "id", "vendor", "vendor_id",
            "full_name", "date_of_birth", "nationality", "national_id_number",
            "business_registration_number", "tax_id_number", "business_address", "business_phone",
            "bank_name", "bank_account_number", "bank_routing_number",
            "national_id_document", "business_registration_document", "tax_document", "bank_statement",
            "status", "submitted_at", "reviewed_at", "reviewed_by", "rejection_reason", "admin_notes",
            "created_at", "updated_at"
        ]
        read_only_fields = ["submitted_at", "reviewed_at", "reviewed_by", "created_at", "updated_at"]

    def validate_vendor_id(self, value):
        """Validate that the vendor exists and doesn't already have KYC submitted."""
        try:
            vendor = Vendor.objects.get(id=value)
            if hasattr(vendor, 'kyc'):
                raise serializers.ValidationError("KYC already submitted for this vendor")
            return value
        except Vendor.DoesNotExist:
            raise serializers.ValidationError("Vendor not found")

    def create(self, validated_data):
        vendor_id = validated_data.pop("vendor_id")
        try:
            vendor = Vendor.objects.get(id=vendor_id)
        except Vendor.DoesNotExist:
            raise serializers.ValidationError({"vendor_id": "Vendor not found"})

        # Double-check in case validation was bypassed
        if VendorKYC.objects.filter(vendor=vendor).exists():
            raise serializers.ValidationError({"vendor_id": "KYC already submitted for this vendor"})

        validated_data["vendor"] = vendor
class RiderKYCSerializer(serializers.ModelSerializer):
    rider = RiderSerializer(read_only=True)
    rider_id = serializers.IntegerField(write_only=True, required=True)
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = RiderKYC
        fields = [
            "id", "rider", "rider_id",
            "full_name", "date_of_birth", "nationality", "national_id_number",
            "vehicle_type", "license_plate", "vehicle_registration_number",
            "drivers_license_number", "license_issue_date", "license_expiry_date",
            "emergency_contact_name", "emergency_contact_phone",
            "drivers_license_document", "vehicle_registration_document", "insurance_document", "national_id_document",
            "status", "submitted_at", "reviewed_at", "reviewed_by", "rejection_reason", "admin_notes",
            "created_at", "updated_at"
        ]
        read_only_fields = ["submitted_at", "reviewed_at", "reviewed_by", "created_at", "updated_at"]

    def validate_rider_id(self, value):
        """Validate that the rider exists and doesn't already have KYC submitted."""
        try:
            rider = Rider.objects.get(id=value)
            if hasattr(rider, 'kyc'):
                raise serializers.ValidationError("KYC already submitted for this rider")
            return value
        except Rider.DoesNotExist:
            raise serializers.ValidationError("Rider not found")

    def create(self, validated_data):
        rider_id = validated_data.pop("rider_id")
        try:
            rider = Rider.objects.get(id=rider_id)
        except Rider.DoesNotExist:
            raise serializers.ValidationError({"rider_id": "Rider not found"})

        # Double-check in case validation was bypassed
        if RiderKYC.objects.filter(rider=rider).exists():
            raise serializers.ValidationError({"rider_id": "KYC already submitted for this rider"})

        validated_data["rider"] = rider
        return RiderKYC.objects.create(**validated_data)
