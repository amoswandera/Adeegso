from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import Payment
from .serializers import PaymentSerializer


# Create your views here.


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related("order")
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.request.method in ("GET",):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
