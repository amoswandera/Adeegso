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
from rest_framework.routers import DefaultRouter
from apps.catalog.views import ProductViewSet
from apps.accounts.views import RiderViewSet, UserViewSet, VendorViewSet, register_user, user_profile, debug_users
from apps.orders.views import OrderViewSet
from apps.payments.views import PaymentViewSet
from apps.accounts.cart_views import get_cart, update_cart
from apps.accounts.token_serializers import CustomTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.decorators.csrf import csrf_exempt

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"vendors", VendorViewSet, basename="vendor")
router.register(r"riders", RiderViewSet, basename="rider")
router.register(r"users", UserViewSet, basename="user")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/token/', csrf_exempt(CustomTokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('api/auth/refresh/', csrf_exempt(TokenRefreshView.as_view()), name='token_refresh'),
    path('api/auth/register/', register_user, name='register_user'),
    path('api/auth/me/', user_profile, name='user_profile'),
    path('api/auth/debug/users/', debug_users, name='debug_users'),  # Temporary debug endpoint
    path('api/cart/', get_cart, name='get_cart'),
]
