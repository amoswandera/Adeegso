from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
from .models import Account, Vendor, Rider, Wallet, WalletTransaction, VendorKYC, RiderKYC
from .serializers import (
    RiderSerializer, UserSerializer, VendorSerializer, WalletSerializer, WalletTransactionSerializer, VendorKYCSerializer, RiderKYCSerializer
)
from .serializers import AdminUserCreateSerializer
from .permissions import IsAdmin, IsVendor, ReadOnly
from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer


class VendorProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for vendors to manage their own products.
    Only authenticated vendors can access their products.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)  # Handle file uploads and JSON

    def get_queryset(self):
        """
        Return only products belonging to the authenticated vendor.
        """
        user = self.request.user
        if not hasattr(user, 'account') or user.account.role != 'vendor':
            return Product.objects.none()

        try:
            vendor = Vendor.objects.get(owner=user)  # Use owner field
            return Product.objects.filter(vendor=vendor)
        except Vendor.DoesNotExist:
            return Product.objects.none()

    def perform_create(self, serializer):
        """
        Create a product for the authenticated vendor.
        """
        user = self.request.user

        # Ensure the user is a vendor
        if not hasattr(user, 'account') or user.account.role != 'vendor':
            raise PermissionDenied("Only vendors can create products")

        try:
            vendor = Vendor.objects.get(owner=user)
        except Vendor.DoesNotExist:
            raise PermissionDenied("Vendor profile not found")

        # Create product for this vendor
        serializer.save(vendor=vendor)

    def perform_update(self, serializer):
        """
        Update a product - ensure vendor owns the product.
        """
        user = self.request.user
        product = self.get_object()

        # Ensure the user is a vendor and owns this product
        if not hasattr(user, 'account') or user.account.role != 'vendor':
            raise PermissionDenied("Only vendors can update products")

        try:
            vendor = Vendor.objects.get(owner=user)
            if product.vendor != vendor:
                raise PermissionDenied("You can only update your own products")
        except Vendor.DoesNotExist:
            raise PermissionDenied("Vendor profile not found")

        serializer.save()

    def perform_destroy(self, instance):
        """
        Delete a product - ensure vendor owns the product.
        """
        user = self.request.user

        # Ensure the user is a vendor and owns this product
        if not hasattr(user, 'account') or user.account.role != 'vendor':
            raise PermissionDenied("Only vendors can delete products")

        try:
            vendor = Vendor.objects.get(owner=user)
            if instance.vendor != vendor:
                raise PermissionDenied("You can only delete your own products")
        except Vendor.DoesNotExist:
            raise PermissionDenied("Vendor profile not found")

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a product (vendor can approve their own products)"""
        product = self.get_object()
        user = request.user

        # Ensure the user is a vendor and owns this product
        if not hasattr(user, 'account') or user.account.role != 'vendor':
            raise PermissionDenied("Only vendors can approve products")

        try:
            vendor = Vendor.objects.get(owner=user)
            if product.vendor != vendor:
                raise PermissionDenied("You can only approve your own products")
        except Vendor.DoesNotExist:
            raise PermissionDenied("Vendor profile not found")

        product.approve(user)

        # Return updated product data
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a product (vendor can reject their own products)"""
        product = self.get_object()
        user = request.user
        reason = request.data.get('reason', '')

        # Ensure the user is a vendor and owns this product
        if not hasattr(user, 'account') or user.account.role != 'vendor':
            raise PermissionDenied("Only vendors can reject products")

        try:
            vendor = Vendor.objects.get(owner=user)
            if product.vendor != vendor:
                raise PermissionDenied("You can only reject your own products")
        except Vendor.DoesNotExist:
            raise PermissionDenied("Vendor profile not found")

        product.reject(user, reason)

        # Return updated product data
        serializer = self.get_serializer(product)
        return Response(serializer.data)


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
                Rider.objects.create(user=user, verified=True)

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


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Authenticate user and return JWT tokens
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'detail': 'Both username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Authenticate user
    user = authenticate(username=username, password=password)

    if user is None:
        return Response(
            {'detail': 'Invalid username or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {'detail': 'User account is disabled'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Generate tokens
    refresh = RefreshToken.for_user(user)

    # Get user role from Account model
    try:
        account = user.account
        user_role = account.role
        phone_number = account.phone_number
        is_verified = account.is_verified
    except Account.DoesNotExist:
        user_role = 'customer'
        phone_number = ''
        is_verified = False

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user_role,
            'phone_number': phone_number,
            'is_verified': is_verified
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refresh access token using refresh token
    """
    refresh_token = request.data.get('refresh')

    if not refresh_token:
        return Response(
            {'detail': 'Refresh token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)
        return Response({'access': access_token})
    except Exception as e:
        return Response(
            {'detail': 'Invalid refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
def logout_user(request):
    """
    Logout user (client-side should remove tokens)
    """
    return Response({'detail': 'Successfully logged out'})


@api_view(['GET', 'PUT'])
def get_current_user(request):
    """
    Get or update current authenticated user's profile
    """
    user = request.user

    if not user.is_authenticated:
        return Response(
            {'detail': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if request.method == 'GET':
        # Get user role from Account model
        try:
            account = user.account
            user_role = account.role
            phone_number = account.phone_number
            is_verified = account.is_verified
        except Account.DoesNotExist:
            user_role = 'customer'
            phone_number = ''
            is_verified = False

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user_role,
            'phone_number': phone_number,
            'is_verified': is_verified
        })
    elif request.method == 'PUT':
        # Update user profile
        data = request.data
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.save()

        # Update account if exists
        try:
            account = user.account
            account.phone_number = data.get('phone_number', account.phone_number)
            account.save()
        except Account.DoesNotExist:
            pass  # No account to update

        return Response({'detail': 'Profile updated successfully'})


class RiderViewSet(viewsets.ModelViewSet):
    queryset = Rider.objects.all().select_related("user")
    serializer_class = RiderSerializer

    def get_permissions(self):
        # Allow admins full access, authenticated users can view and update their own profile
        user = self.request.user
        if self.request.method in ("GET",):
            return [permissions.IsAuthenticated()]
        # For create, update, delete operations, require admin or allow users to update their own profile
        if self.action in ['profile']:
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

    @action(detail=False, methods=['get', 'put'], permission_classes=[permissions.IsAuthenticated])
    def profile(self, request):
        """Get or update current user's rider profile"""
        user = request.user

        # Check if user has rider role
        if not hasattr(user, 'account') or user.account.role != 'rider':
            return Response({'detail': 'User is not a rider'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Try to get the rider record
            rider = Rider.objects.get(user=user)
        except Rider.DoesNotExist:
            # Create rider record if it doesn't exist
            rider = Rider.objects.create(user=user, verified=True)

        if request.method == 'GET':
            # Return complete profile data with user and rider information
            try:
                account = user.account
                phone_number = account.phone_number
                is_verified = account.is_verified
            except Account.DoesNotExist:
                phone_number = ''
                is_verified = False

            return Response({
                'user': {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'phone_number': phone_number,
                    'is_verified': is_verified
                },
                'rider': {
                    'id': rider.id,
                    'vehicle_type': rider.vehicle_type,
                    'license_plate': rider.license_plate,
                    'verified': rider.verified
                }
            })
        elif request.method == 'PUT':
            # Update user information
            user_data = request.data.get('user', {})
            for field in ['first_name', 'last_name', 'email']:
                if field in user_data:
                    setattr(user, field, user_data[field])
            user.save()

            # Update account information (phone_number)
            try:
                account = user.account
                if 'phone_number' in user_data:
                    account.phone_number = user_data['phone_number']
                    account.save()
            except Account.DoesNotExist:
                # Create account if it doesn't exist
                Account.objects.create(
                    user=user,
                    role='rider',
                    phone_number=user_data.get('phone_number', ''),
                    is_verified=True
                )

            # Update rider information
            rider_data = request.data.get('rider', {})
            serializer = self.get_serializer(rider, data=rider_data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()

            # Return complete profile data after update
            try:
                account = user.account
                phone_number = account.phone_number
                is_verified = account.is_verified
            except Account.DoesNotExist:
                phone_number = ''
                is_verified = False

            return Response({
                'user': {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'phone_number': phone_number,
                    'is_verified': is_verified
                },
                'rider': {
                    'id': rider.id,
                    'vehicle_type': rider.vehicle_type,
                    'license_plate': rider.license_plate,
                    'verified': rider.verified
                }
            })

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
        # TEMPORARY: Allow all requests for development - NO AUTH REQUIRED
        return [permissions.AllowAny()]

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

    @action(detail=False, methods=['get', 'put'], permission_classes=[permissions.AllowAny])
    def profile(self, request):
        """Get or update current user's vendor profile"""
        user = request.user

        # For development, return default if not authenticated
        if not user.is_authenticated:
            if request.method == 'GET':
                return Response({
                    'id': 1,
                    'name': 'Test Restaurant',
                    'location': 'Test Location',
                    'approved': True,
                    'commission_rate': 10.0,
                    'rating': 4.5,
                    'rating_count': 100
                })
            else:
                return Response({'detail': 'Authentication required'}, status=401)

        # Get vendor for authenticated user
        try:
            vendor = Vendor.objects.get(owner=user)
        except Vendor.DoesNotExist:
            return Response({'detail': 'Vendor profile not found'}, status=404)

        if request.method == 'GET':
            serializer = self.get_serializer(vendor)
            return Response(serializer.data)
        elif request.method == 'PUT':
            serializer = self.get_serializer(vendor, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

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
            raise PermissionDenied("Only administrators can create vendors")

        # The actual creation is handled by the serializer
        serializer.save()

    def perform_update(self, serializer):
        # Only admins or the vendor owner can update vendor info
        user = self.request.user
        if not (user.is_superuser or
               (hasattr(user, 'account') and
                (user.account.role == 'admin' or
                 (user.account.role == 'vendor' and serializer.instance.owner == user)))):
            raise PermissionDenied("You do not have permission to update this vendor")
        serializer.save()

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def analytics(self, request):
        """Get vendor analytics for the current user"""
        # TEMPORARY: Return empty analytics for development - NO AUTH REQUIRED
        return Response({
            'total_orders': 0,
            'total_revenue': 0,
            'completed_orders': 0,
            'average_order_value': 0,
            'daily_sales': [],
            'top_products': []
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def earnings(self, request):
        """Get vendor earnings data"""
        # TEMPORARY: Return empty earnings for development - NO AUTH REQUIRED
        return Response({
            'total_earnings': 0,
            'commission_rate': 0,
            'commission_amount': 0,
            'net_earnings': 0,
            'weekly_earnings': []
        })


class WalletViewSet(viewsets.ModelViewSet):
    """ViewSet for rider wallet management"""
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Riders can only see their own wallet"""
        user = self.request.user
        if hasattr(user, 'rider'):
            return Wallet.objects.filter(rider__user=user)
        return Wallet.objects.none()

    def get_object(self):
        """Get the wallet for the current rider"""
        user = self.request.user
        if hasattr(user, 'rider'):
            try:
                return Wallet.objects.get(rider__user=user)
            except Wallet.DoesNotExist:
                # Create wallet if it doesn't exist
                wallet = Wallet.objects.create(rider=user.rider)
                return wallet
        raise PermissionDenied("No wallet found for this rider")


class WalletTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing wallet transactions"""
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Riders can only see their own wallet transactions"""
        user = self.request.user
        if hasattr(user, 'rider'):
            try:
                wallet = Wallet.objects.get(rider__user=user)
                return WalletTransaction.objects.filter(wallet=wallet)
            except Wallet.DoesNotExist:
                return WalletTransaction.objects.none()
        return WalletTransaction.objects.none()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def rider_wallet_balance(request):
    """Get current rider's wallet balance"""
    user = request.user
    if not hasattr(user, 'rider'):
        return Response({'detail': 'User is not a rider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = Wallet.objects.get(rider__user=user)
        return Response({
            'balance': float(wallet.balance),
            'rider_id': user.rider.id,
            'rider_name': f"{user.first_name} {user.last_name}"
        })
    except Wallet.DoesNotExist:
        # Create wallet if it doesn't exist
        wallet = Wallet.objects.create(rider=user.rider)
        return Response({
            'balance': float(wallet.balance),
            'rider_id': user.rider.id,
            'rider_name': f"{user.first_name} {user.last_name}"
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def rider_wallet_transactions(request):
    """Get rider's wallet transaction history"""
    user = request.user
    if not hasattr(user, 'rider'):
        return Response({'detail': 'User is not a rider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = Wallet.objects.get(rider__user=user)
        transactions = WalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        serializer = WalletTransactionSerializer(transactions, many=True)
        return Response({
            'transactions': serializer.data,
            'total_transactions': transactions.count()
        })
    except Wallet.DoesNotExist:
        return Response({'transactions': [], 'total_transactions': 0})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def rider_wallet_withdraw(request):
    """Process rider wallet withdrawal request"""
    user = request.user
    if not hasattr(user, 'rider'):
        return Response({'detail': 'User is not a rider'}, status=status.HTTP_400_BAD_REQUEST)

    amount = request.data.get('amount')
    if not amount:
        return Response({'detail': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = float(amount)
        if amount <= 0:
            return Response({'detail': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        wallet = Wallet.objects.get(rider__user=user)
        if wallet.balance < amount:
            return Response({'detail': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        # Create withdrawal transaction (but don't actually withdraw yet - admin approval needed)
        WalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type=Wallet.TransactionType.WITHDRAWAL,
            description=f"Withdrawal request for ${amount}"
        )

        return Response({
            'detail': 'Withdrawal request submitted successfully',
            'amount': amount,
            'remaining_balance': float(wallet.balance)
        })

    except Wallet.DoesNotExist:
        return Response({'detail': 'Wallet not found'}, status=status.HTTP_404_NOT_FOUND)


# KYC API Endpoints
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_vendor_kyc(request):
    """Submit KYC documents for vendor verification"""
    user = request.user
    if not hasattr(user, 'vendor'):
        return Response({'detail': 'User is not a vendor'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        vendor = user.vendor
    except Vendor.DoesNotExist:
        return Response({'detail': 'Vendor profile not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if KYC already submitted
    if hasattr(vendor, 'kyc'):
        return Response({'detail': 'KYC already submitted for this vendor'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = VendorKYCSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(vendor=vendor)
        return Response({
            'detail': 'KYC submitted successfully',
            'kyc_id': serializer.instance.id,
            'status': serializer.instance.status
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_vendor_kyc_status(request):
    """Get KYC status for the current vendor"""
    user = request.user

    # Check if user has vendor role
    if not hasattr(user, 'account') or user.account.role != 'vendor':
        return Response({'detail': 'User is not a vendor'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Try to get the vendor record
        vendor = Vendor.objects.get(owner=user)
    except Vendor.DoesNotExist:
        return Response({
            'kyc': None,
            'vendor_approved': False,
            'message': 'Vendor profile not found'
        })

    try:
        # Try to get KYC for this vendor
        kyc = vendor.kyc
        serializer = VendorKYCSerializer(kyc)
        return Response({
            'kyc': serializer.data,
            'vendor_approved': vendor.approved
        })
    except VendorKYC.DoesNotExist:
        return Response({
            'kyc': None,
            'vendor_approved': vendor.approved,
            'message': 'KYC not submitted yet'
        })


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_pending_kyc(request):
    """List all pending KYC submissions for admin review"""
    pending_kyc = VendorKYC.objects.filter(status=VendorKYC.Status.PENDING).order_by('-submitted_at')
    serializer = VendorKYCSerializer(pending_kyc, many=True)
    return Response({
        'pending_kyc': serializer.data,
        'total_pending': pending_kyc.count()
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_kyc_detail(request, kyc_id):
    """Get detailed KYC information for admin review"""
    try:
        kyc = VendorKYC.objects.get(id=kyc_id)
        serializer = VendorKYCSerializer(kyc)
        return Response(serializer.data)
    except VendorKYC.DoesNotExist:
        return Response({'detail': 'KYC not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def approve_kyc(request, kyc_id):
    """Approve KYC submission"""
    try:
        kyc = VendorKYC.objects.get(id=kyc_id)
        admin_user = request.user

        kyc.approve(admin_user)

        return Response({
            'detail': 'KYC approved successfully',
            'kyc_id': kyc.id,
            'vendor_id': kyc.vendor.id,
            'vendor_name': kyc.vendor.name
        })
    except VendorKYC.DoesNotExist:
        return Response({'detail': 'KYC not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def reject_kyc(request, kyc_id):
    """Reject KYC submission"""
    try:
        kyc = VendorKYC.objects.get(id=kyc_id)
        admin_user = request.user
        reason = request.data.get('reason', '')

        if not reason:
            return Response({'detail': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)

        kyc.reject(admin_user, reason)

        return Response({
            'detail': 'KYC rejected',
            'kyc_id': kyc.id,
            'vendor_id': kyc.vendor.id,
            'vendor_name': kyc.vendor.name,
            'reason': reason
        })
    except VendorKYC.DoesNotExist:
        return Response({'detail': 'KYC not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def request_kyc_changes(request, kyc_id):
    """Request changes to KYC submission"""
    try:
        kyc = VendorKYC.objects.get(id=kyc_id)
        admin_user = request.user
        notes = request.data.get('notes', '')

        if not notes:
            return Response({'detail': 'Notes for requested changes are required'}, status=status.HTTP_400_BAD_REQUEST)

        kyc.request_changes(admin_user, notes)

        return Response({
            'detail': 'Changes requested successfully',
            'kyc_id': kyc.id,
            'vendor_id': kyc.vendor.id,
            'vendor_name': kyc.vendor.name,
            'notes': notes
        })
    except VendorKYC.DoesNotExist:
        return Response({'detail': 'KYC not found'}, status=status.HTTP_404_NOT_FOUND)


# Rider KYC API Endpoints
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_rider_kyc(request):
    """Submit KYC documents for rider verification"""
    user = request.user
    if not hasattr(user, 'rider'):
        return Response({'detail': 'User is not a rider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rider = user.rider
    except Rider.DoesNotExist:
        return Response({'detail': 'Rider profile not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if KYC already submitted
    if hasattr(rider, 'kyc'):
        return Response({'detail': 'KYC already submitted for this rider'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = RiderKYCSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(rider=rider)
        return Response({
            'detail': 'KYC submitted successfully',
            'kyc_id': serializer.instance.id,
            'status': serializer.instance.status
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_rider_kyc_status(request):
    """Get KYC status for the current rider"""
    user = request.user

    # Check if user has rider role
    if not hasattr(user, 'account') or user.account.role != 'rider':
        return Response({'detail': 'User is not a rider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Try to get the rider record
        rider = Rider.objects.get(user=user)
    except Rider.DoesNotExist:
        return Response({
            'kyc': None,
            'rider_verified': False,
            'message': 'Rider profile not found'
        })

    try:
        # Try to get KYC for this rider
        kyc = rider.kyc
        serializer = RiderKYCSerializer(kyc)
        return Response({
            'kyc': serializer.data,
            'rider_verified': rider.verified
        })
    except RiderKYC.DoesNotExist:
        return Response({
            'kyc': None,
            'rider_verified': rider.verified,
            'message': 'KYC not submitted yet'
        })


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_pending_rider_kyc(request):
    """List all pending rider KYC submissions for admin review"""
    pending_kyc = RiderKYC.objects.filter(status=RiderKYC.Status.PENDING).order_by('-submitted_at')
    serializer = RiderKYCSerializer(pending_kyc, many=True)
    return Response({
        'pending_kyc': serializer.data,
        'total_pending': pending_kyc.count()
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_rider_kyc_detail(request, kyc_id):
    """Get detailed rider KYC information for admin review"""
    try:
        kyc = RiderKYC.objects.get(id=kyc_id)
        serializer = RiderKYCSerializer(kyc)
        return Response(serializer.data)
    except RiderKYC.DoesNotExist:
        return Response({'detail': 'Rider KYC not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def approve_rider_kyc(request, kyc_id):
    """Approve rider KYC submission"""
    try:
        kyc = RiderKYC.objects.get(id=kyc_id)
        admin_user = request.user

        kyc.approve(admin_user)

        return Response({
            'detail': 'Rider KYC approved successfully',
            'kyc_id': kyc.id,
            'rider_id': kyc.rider.id,
            'rider_name': kyc.rider.user.get_full_name()
        })
    except RiderKYC.DoesNotExist:
        return Response({'detail': 'Rider KYC not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def reject_rider_kyc(request, kyc_id):
    """Reject rider KYC submission"""
    try:
        kyc = RiderKYC.objects.get(id=kyc_id)
        admin_user = request.user
        reason = request.data.get('reason', '')

        if not reason:
            return Response({'detail': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)

        kyc.reject(admin_user, reason)

        return Response({
            'detail': 'Rider KYC rejected',
            'kyc_id': kyc.id,
            'rider_id': kyc.rider.id,
            'rider_name': kyc.rider.user.get_full_name(),
            'reason': reason
        })
    except RiderKYC.DoesNotExist:
        return Response({'detail': 'Rider KYC not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdmin])
def request_rider_kyc_changes(request, kyc_id):
    """Request changes to rider KYC submission"""
    try:
        kyc = RiderKYC.objects.get(id=kyc_id)
        admin_user = request.user
        notes = request.data.get('notes', '')

        if not notes:
            return Response({'detail': 'Notes for requested changes are required'}, status=status.HTTP_400_BAD_REQUEST)

        kyc.request_changes(admin_user, notes)

        return Response({
            'detail': 'Changes requested successfully',
            'kyc_id': kyc.id,
            'rider_id': kyc.rider.id,
            'rider_name': kyc.rider.user.get_full_name(),
            'notes': notes
        })
    except RiderKYC.DoesNotExist:
        return Response({'detail': 'Rider KYC not found'}, status=status.HTTP_404_NOT_FOUND)
