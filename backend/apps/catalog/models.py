from django.db import models
from django.conf import settings
from django.utils import timezone


class Product(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Pending Approval'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    vendor = models.ForeignKey('accounts.Vendor', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, blank=True)  # Add category field
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    active = models.BooleanField(default=True)
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_products')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.name} - {self.vendor.name}"

    def approve(self, admin_user):
        """Approve the product"""
        self.approval_status = self.ApprovalStatus.APPROVED
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.rejection_reason = ''
        self.save()

    def reject(self, admin_user, reason=''):
        """Reject the product with optional reason"""
        self.approval_status = self.ApprovalStatus.REJECTED
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.rejection_reason = reason
        self.save()
from django.db import models

# Create your models here.
