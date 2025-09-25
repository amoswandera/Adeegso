from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


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
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Rider {self.user.username}"
from django.db import models

# Create your models here.
