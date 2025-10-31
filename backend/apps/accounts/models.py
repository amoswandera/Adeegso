from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Account(models.Model):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        VENDOR = 'vendor', 'Vendor'
        RIDER = 'rider', 'Rider'
        CUSTOMER = 'customer', 'Customer'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='account')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone_number = models.CharField(max_length=32, unique=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"


class Vendor(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor')
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    approved = models.BooleanField(default=False)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # Glovo-style metadata
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)  # 0.00 - 5.00
    rating_count = models.PositiveIntegerField(default=0)
    discount_percent = models.PositiveIntegerField(default=0)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Rider(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rider')
    verified = models.BooleanField(default=False)
    # Vehicle information
    vehicle_type = models.CharField(max_length=20, blank=True, choices=[
        ('motorcycle', 'Motorcycle'),
        ('car', 'Car'),
        ('bicycle', 'Bicycle'),
        ('scooter', 'Scooter'),
    ])
    license_plate = models.CharField(max_length=20, blank=True)
    # GPS tracking fields
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)  # Rider availability status
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Rider {self.user.username}"

    @property
    def wallet_balance(self):
        """Get wallet balance from associated Wallet model"""
        try:
            return self.wallet.balance
        except (Wallet.DoesNotExist, AttributeError):
            return 0

    @wallet_balance.setter
    def wallet_balance(self, value):
        """Set wallet balance in associated Wallet model"""
        try:
            self.wallet.balance = value
            self.wallet.save(update_fields=['balance'])
        except (Wallet.DoesNotExist, AttributeError):
            # Create wallet if it doesn't exist
            wallet = Wallet.objects.create(rider=self, balance=value)
            self.save()  # Save the rider to establish the relationship

    def update_location(self, latitude, longitude):
        """Update rider's current location"""
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.last_location_update = timezone.now()
        self.save(update_fields=['current_latitude', 'current_longitude', 'last_location_update'])

    def go_online(self):
        """Set rider as available for deliveries"""
        self.is_online = True
        self.save(update_fields=['is_online'])

    def go_offline(self):
        """Set rider as unavailable for deliveries"""
        self.is_online = False
        self.save(update_fields=['is_online'])


class Wallet(models.Model):
    class TransactionType(models.TextChoices):
        EARNING = 'earning', 'Delivery Earning'
        WITHDRAWAL = 'withdrawal', 'Withdrawal'
        BONUS = 'bonus', 'Bonus'

    rider = models.OneToOneField(Rider, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Wallet for {self.rider.user.username} - ${self.balance}"


class WalletTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=Wallet.TransactionType.choices)
    description = models.CharField(max_length=255, blank=True)
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

class VendorKYC(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        REQUIRES_CHANGES = 'requires_changes', 'Requires Changes'

    vendor = models.OneToOneField(Vendor, on_delete=models.CASCADE, related_name='kyc')

    # Personal Information
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100)
    national_id_number = models.CharField(max_length=100, unique=True)

    # Business Information
    business_registration_number = models.CharField(max_length=100)
    tax_id_number = models.CharField(max_length=100, blank=True)
    business_address = models.TextField()
    business_phone = models.CharField(max_length=32)

    # Bank Information
    bank_name = models.CharField(max_length=255)
    bank_account_number = models.CharField(max_length=100)
    bank_routing_number = models.CharField(max_length=100, blank=True)

    # Document Uploads
    national_id_document = models.FileField(upload_to='kyc/national_id/', blank=True)
    business_registration_document = models.FileField(upload_to='kyc/business_registration/', blank=True)
    tax_document = models.FileField(upload_to='kyc/tax/', blank=True)
    bank_statement = models.FileField(upload_to='kyc/bank_statement/', blank=True)

    # Status and Review
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_kycs')
    rejection_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"KYC for {self.vendor.name} - {self.status}"

    def approve(self, admin_user):
        """Approve KYC and activate vendor"""
        self.status = self.Status.APPROVED
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.save()

        # Auto-approve the vendor
        self.vendor.approved = True
        self.vendor.save(update_fields=['approved'])

    def reject(self, admin_user, reason):
        """Reject KYC with reason"""
        self.status = self.Status.REJECTED
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.rejection_reason = reason
        self.save()

    def request_changes(self, admin_user, notes):
        """Request changes to KYC"""
        self.status = self.Status.REQUIRES_CHANGES
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.admin_notes = notes
        self.save()


class RiderKYC(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        REQUIRES_CHANGES = 'requires_changes', 'Requires Changes'

    rider = models.OneToOneField(Rider, on_delete=models.CASCADE, related_name='kyc')

    # Personal Information
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    nationality = models.CharField(max_length=100)
    national_id_number = models.CharField(max_length=100, unique=True)

    # Vehicle Information
    vehicle_type = models.CharField(max_length=20, choices=[
        ('motorcycle', 'Motorcycle'),
        ('car', 'Car'),
        ('bicycle', 'Bicycle'),
        ('scooter', 'Scooter'),
    ])
    license_plate = models.CharField(max_length=20)
    vehicle_registration_number = models.CharField(max_length=100)

    # License Information
    drivers_license_number = models.CharField(max_length=100, unique=True)
    license_issue_date = models.DateField()
    license_expiry_date = models.DateField()

    # Contact Information
    emergency_contact_name = models.CharField(max_length=255)
    emergency_contact_phone = models.CharField(max_length=32)

    # Document Uploads
    drivers_license_document = models.FileField(upload_to='kyc/rider/drivers_license/', blank=True)
    vehicle_registration_document = models.FileField(upload_to='kyc/rider/vehicle_registration/', blank=True)
    insurance_document = models.FileField(upload_to='kyc/rider/insurance/', blank=True)
    national_id_document = models.FileField(upload_to='kyc/rider/national_id/', blank=True)

    # Status and Review
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_rider_kycs')
    rejection_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Rider KYC for {self.rider.user.username} - {self.status}"

    def approve(self, admin_user):
        """Approve KYC and activate rider"""
        self.status = self.Status.APPROVED
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.save()

        # Auto-verify the rider
        self.rider.verified = True
        self.rider.save(update_fields=['verified'])

    def reject(self, admin_user, reason):
        """Reject KYC with reason"""
        self.status = self.Status.REJECTED
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.rejection_reason = reason
        self.save()

    def request_changes(self, admin_user, notes):
        """Request changes to KYC"""
        self.status = self.Status.REQUIRES_CHANGES
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.admin_notes = notes
        self.save()
