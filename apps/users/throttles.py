from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

class LoginThrottle(AnonRateThrottle):  # this is used for anonymous users and detected by ip address means an ip address can send 5 requests per minute
    rate = "5/min"

class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]
    