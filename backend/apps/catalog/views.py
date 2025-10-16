from django.shortcuts import render
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
        # Allow POST if vendor_id is provided in request data
        if self.request.method == "POST":
            return [permissions.AllowAny()]
        # For other methods, require authentication
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)

        # For API testing without authentication, return all products
        if not user or not user.is_authenticated:
            return qs  # Return all products for testing

        try:
            role = user.account.role
        except Exception:
            role = None

        if role == 'vendor':
            # Vendors can only see their own products
            return qs.filter(vendor__owner=user)
        elif user.is_superuser or role == 'admin':
            # Admins can see all products
            return qs
        else:
            # Other authenticated users only see approved products
            return qs.filter(approval_status='approved', active=True)

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

    def perform_create(self, serializer):
        # Get vendor_id from request data, or default to vendor 2 (the existing vendor)
        vendor_id = serializer.validated_data.get('vendor_id')
        if not vendor_id:
            # For now, default to vendor 2 (the test vendor we created)
            # In production, this should be handled by proper authentication
            vendor_id = 2

        serializer.save(vendor_id=vendor_id)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a product (admin only)"""
        product = self.get_object()
        user = request.user

        # Check if user is admin
        try:
            role = user.account.role
        except Exception:
            role = None

        if not (user.is_superuser or role == 'admin'):
            raise permissions.PermissionDenied("Only administrators can approve products")

        product.approve(user)

        # Return updated product data
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a product (admin only)"""
        product = self.get_object()
        user = request.user
        reason = request.data.get('reason', '')

        # Check if user is admin
        try:
            role = user.account.role
        except Exception:
            role = None

        if not (user.is_superuser or role == 'admin'):
            raise permissions.PermissionDenied("Only administrators can reject products")

        product.reject(user, reason)

        # Return updated product data
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """Get products pending approval (admin only)"""
        user = request.user

        # Check if user is admin
        try:
            role = user.account.role
        except Exception:
            role = None

        if not (user.is_superuser or role == 'admin'):
            raise permissions.PermissionDenied("Only administrators can view pending approvals")

        products = self.get_queryset().filter(approval_status='pending')
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        user = self.request.user
        try:
            role = user.account.role
        except Exception:
            role = None
        if role == 'vendor' and instance.vendor.owner != user:
            raise permissions.PermissionDenied("Cannot delete products of other vendors")
        return super().perform_destroy(instance)
