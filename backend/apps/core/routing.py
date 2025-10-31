from django.urls import re_path
from .consumers import AdminDashboardConsumer, CustomerOrderConsumer, VendorOrderConsumer, RiderOrderConsumer

websocket_urlpatterns = [
    re_path(r'ws/admin/dashboard/$', AdminDashboardConsumer.as_asgi()),
    re_path(r'ws/customer/orders/$', CustomerOrderConsumer.as_asgi()),
    re_path(r'ws/vendor/orders/$', VendorOrderConsumer.as_asgi()),
    re_path(r'ws/rider/orders/$', RiderOrderConsumer.as_asgi()),
]
