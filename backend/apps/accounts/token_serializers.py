from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from apps.accounts.models import Account


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        print(f"DEBUG: Creating token for user: {user.username}, ID: {user.id}")

        # Add custom claims
        try:
            account = user.account
            print(f"DEBUG: User account found: {account}, Role: {account.role}")
            token['role'] = account.role
            token['phone_number'] = account.phone_number
            token['is_verified'] = account.is_verified
        except Account.DoesNotExist:
            # If no account exists, use default values
            print(f"DEBUG: No account found for user {user.id}")
            token['role'] = 'customer'
            token['phone_number'] = ''
            token['is_verified'] = False

        print(f"DEBUG: Token payload: {token.payload}")
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
