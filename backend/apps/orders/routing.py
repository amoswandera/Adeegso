from django.urls import re_path
from . import consumers
from . import admin_consumer
from . import vendor_consumer

websocket_urlpatterns = [
    re_path(r"^ws/orders/$", consumers.OrdersConsumer.as_asgi()),
    re_path(r"^ws/orders/(?P<order_id>\d+)/$", consumers.OrderDetailConsumer.as_asgi()),
    re_path(r"^ws/admin/dashboard/$", admin_consumer.AdminDashboardConsumer.as_asgi()),
    re_path(r"^ws/vendor/$", vendor_consumer.VendorConsumer.as_asgi()),
]
