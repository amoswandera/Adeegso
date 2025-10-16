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
        except Wallet.DoesNotExist:
            return 0

    @wallet_balance.setter
    def wallet_balance(self, value):
        """Set wallet balance in associated Wallet model"""
        try:
            self.wallet.balance = value
            self.wallet.save(update_fields=['balance'])
        except Wallet.DoesNotExist:
            # Create wallet if it doesn't exist
            wallet = Wallet.objects.create(rider=self, balance=value)
            self.wallet = wallet

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

    def __str__(self) -> str:
        return f"{self.transaction_type} - ${self.amount} for {self.wallet.rider.user.username}"
