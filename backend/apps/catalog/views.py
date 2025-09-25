from django.shortcuts import render
from rest_framework import viewsets, permissions
from django.db import models
from .models import Product
from .serializers import ProductSerializer
from apps.accounts.models import Vendor
from apps.accounts.serializers import VendorSerializer
from apps.accounts.permissions import IsVendor, IsAdmin, ReadOnly


# Create your views here.


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related("vendor")
    serializer_class = ProductSerializer
    def get_permissions(self):
        if self.request.method in ("GET",):
            return [permissions.AllowAny()]
        # Vendors can create and update/delete their own products; admins can manage all
        if self.request.method in ("POST", "PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)
        if not user or not user.is_authenticated:
            return qs
        try:
            role = user.account.role
        except Exception:
            role = None
        if role == 'vendor':
            return qs.filter(vendor__owner=user)
        if user.is_superuser or role == 'admin':
            return qs
        # Others: read-only access already covered
        return qs

    def perform_update(self, serializer):
        user = self.request.user
        obj = self.get_object()
        # If vendor, ensure ownership
        try:
            role = user.account.role
        except Exception:
            role = None
        if role == 'vendor' and obj.vendor.owner != user:
            raise permissions.PermissionDenied("Cannot modify products of other vendors")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        try:
            role = user.account.role
        except Exception:
            role = None
        if role == 'vendor' and instance.vendor.owner != user:
            raise permissions.PermissionDenied("Cannot delete products of other vendors")
        return super().perform_destroy(instance)
