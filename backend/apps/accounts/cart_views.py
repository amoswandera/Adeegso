from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

# Simple cart view for now
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_cart(request):
    """
    Get user cart - returns empty array for now
    """
    return Response([])

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_cart(request):
    """
    Update user cart - placeholder for now
    """
    return Response({"detail": "Cart functionality not yet implemented"}, status=status.HTTP_501_NOT_IMPLEMENTED)
