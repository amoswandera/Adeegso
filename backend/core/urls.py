"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from apps.catalog.views import ProductViewSet
from apps.accounts.views import RiderViewSet, UserViewSet, VendorViewSet, VendorProductViewSet, register_user, user_profile, debug_users, login_user, refresh_token, logout_user, get_current_user
from apps.orders.views import OrderViewSet, RiderDeliveryViewSet
from apps.payments.views import PaymentViewSet
from apps.accounts.cart_views import get_cart, update_cart
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

# Import the custom admin site
from .admin import marketplace_admin

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"vendor/products", VendorProductViewSet, basename="vendor-product")
router.register(r"vendors", VendorViewSet, basename="vendor")
router.register(r"riders", RiderViewSet, basename="rider")
router.register(r"rider/deliveries", RiderDeliveryViewSet, basename="rider-delivery")
router.register(r"users", UserViewSet, basename="user")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path('admin/', marketplace_admin.urls),  # Use custom admin site
    path('api/', include(router.urls)),  # Add router URLs
    path('api/vendor/profile/', VendorViewSet.as_view({'get': 'profile'}), name='vendor-profile'),
    path('api/vendor/analytics/', VendorViewSet.as_view({'get': 'analytics'}), name='vendor-analytics'),
    path('api/vendor/earnings/', VendorViewSet.as_view({'get': 'earnings'}), name='vendor-earnings'),
    # Authentication endpoints
    path('api/auth/login/', login_user, name='login'),
    path('api/auth/register/', register_user, name='register'),
    path('api/auth/refresh/', refresh_token, name='refresh_token'),
    path('api/auth/logout/', logout_user, name='logout'),
    path('api/auth/me/', get_current_user, name='current_user'),
    path('api/auth/debug/users/', debug_users, name='debug_users'),  # Temporary debug endpoint
    path('api/cart/', get_cart, name='get_cart'),
    path('api/cart/update/', update_cart, name='update_cart'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
