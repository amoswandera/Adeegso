from django.db import models


class Payment(models.Model):
    class Provider(models.TextChoices):
        ZAAD = 'zaad', 'Zaad'
        SAHAL = 'sahal', 'Sahal'
        EVC = 'evc', 'EVC'
        EDAHAB = 'edahab', 'Edahab'

    class Status(models.TextChoices):
        INITIATED = 'initiated', 'Initiated'
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        FAILED = 'failed', 'Failed'

    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='payment')
    provider = models.CharField(max_length=20, choices=Provider.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    transaction_reference = models.CharField(max_length=128, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Payment for Order #{self.order_id} - {self.provider} - {self.status}"


class AuditLog(models.Model):
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
    actor_id = models.IntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
