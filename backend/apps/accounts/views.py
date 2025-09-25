from django.shortcuts import render
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth.models import User
from .models import Rider, Vendor, Account
from .serializers import RiderSerializer, UserSerializer, VendorSerializer
from .serializers import AdminUserCreateSerializer
from .permissions import IsAdmin, IsVendor, ReadOnly
from django.db import transaction

# Create your views here.


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """
    Register a new user account with role (customer, vendor, rider)
    """
    try:
        data = request.data.copy()

        # Validate required fields
        required_fields = ['username', 'email', 'password', 'phone_number', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'detail': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            return Response(
                {'detail': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'detail': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if phone number already exists
        if Account.objects.filter(phone_number=data['phone_number']).exists():
            return Response(
                {'detail': 'Phone number already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create user
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name']
            )

            # Create account with role
            account = Account.objects.create(
                user=user,
                role=data['role'],
                phone_number=data['phone_number'],
                is_verified=True  # Auto-verify for self-registration
            )

            # Create vendor record if role is vendor
            if data['role'] == Account.Role.VENDOR:
                # Get additional vendor fields if provided
                vendor_name = data.get('vendor_name', f"{user.first_name} {user.last_name} Restaurant")
                vendor_location = data.get('vendor_location', '')

                Vendor.objects.create(
                    owner=user,
                    name=vendor_name,
                    location=vendor_location,
                    approved=False,  # Vendors start unapproved
                    commission_rate=10.00,  # Default commission
                    rating=0.0,
                    rating_count=0
                )

            # Create rider record if role is rider
            elif data['role'] == Account.Role.RIDER:
                Rider.objects.create(user=user)

        return Response(
            {
                'detail': 'Account created successfully',
                'user_id': user.id,
                'role': account.role
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        return Response(
            {'detail': f'Registration failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # Allow unauthenticated for debugging
def debug_users(request):
    """
    Debug endpoint to list all users and their accounts
    """
    users = User.objects.all()
    data = []

    for user in users:
        try:
            account = user.account
            account_info = {
                'role': account.role,
                'phone_number': account.phone_number,
                'is_verified': account.is_verified
            }
        except Account.DoesNotExist:
            account_info = None

        data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'account': account_info
        })

    return Response(data)


# Add this to the URLs for debugging
# path('api/auth/debug/users/', debug_users, name='debug_users'),


@api_view(['GET'])
@permission_classes([permissions.AllowAny])  # Allow unauthenticated access for now
def user_profile(request):
    """
    Get current user profile with role information
    """
    print(f"DEBUG: User profile request by user: {request.user}")
    print(f"DEBUG: User authenticated: {request.user.is_authenticated}")

    # For now, return a default user profile
    return Response({
        'id': 1,
        'username': 'guest',
        'email': 'guest@example.com',
        'first_name': 'Guest',
        'last_name': 'User',
        'role': 'customer',  # Default role
        'phone_number': '',
        'is_verified': False
    })


class RiderViewSet(viewsets.ModelViewSet):
    queryset = Rider.objects.all().select_related("user")
    serializer_class = RiderSerializer

    def get_permissions(self):
        # Only admins can create/update/delete riders; listing restricted to admins for now
        if self.request.method in ("GET",):
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        verified = params.get('verified')
        if verified in ('true', 'false'):
            qs = qs.filter(verified=(verified == 'true'))
        q = params.get('q')
        if q:
            qs = qs.filter(user__username__icontains=q)
        return qs


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer

    def get_permissions(self):
        # Only admins can view users via API
        return [IsAdmin()]

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        return super().get_serializer_class()


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().select_related("owner")
    serializer_class = VendorSerializer

    def get_permissions(self):
        if self.request.method in ("GET",):
            return [permissions.AllowAny()]
        # Only admins can create/update/delete vendors
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # For unauthenticated users, only show approved vendors
        if not user.is_authenticated:
            return qs.filter(approved=True)

        # Superusers and admins can see all vendors
        if user.is_superuser or (hasattr(user, 'account') and user.account.role == 'admin'):
            return qs

        # Vendors can only see their own vendor profile
        if hasattr(user, 'account') and user.account.role == 'vendor':
            return qs.filter(owner=user)

        # Default: only show approved vendors to other authenticated users
        return qs.filter(approved=True)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user's vendor profile"""
        user = request.user
        try:
            vendor = Vendor.objects.get(owner=user)
            serializer = self.get_serializer(vendor)
            return Response(serializer.data)
        except Vendor.DoesNotExist:
            return Response({
                'detail': 'Vendor profile not found. Please complete your vendor registration.'
            }, status=status.HTTP_404_NOT_FOUND)

    def create(self, request, *args, **kwargs):
        try:
            response = super().create(request, *args, **kwargs)
            return response
        except serializers.ValidationError as e:
            return Response(
                {"detail": str(e) if isinstance(e, serializers.ValidationError) else "Validation error"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"detail": "An error occurred while creating the vendor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        # Only admins can create vendors via the API
        if not (self.request.user.is_superuser or
               (hasattr(self.request.user, 'account') and
                self.request.user.account.role == 'admin')):
            raise permissions.PermissionDenied("Only administrators can create vendors")

        # The actual creation is handled by the serializer
        serializer.save()

    def perform_update(self, serializer):
        # Only admins or the vendor owner can update vendor info
        user = self.request.user
        if not (user.is_superuser or
               (hasattr(user, 'account') and
                (user.account.role == 'admin' or
                 (user.account.role == 'vendor' and serializer.instance.owner == user)))):
            raise permissions.PermissionDenied("You do not have permission to update this vendor")
        serializer.save()
