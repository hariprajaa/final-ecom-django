from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from .models import Product, Category, UserData
from .serializers import ProductSerializer, CategorySerializer, UserSerializer
from .utils.password_utils import hash_password, verify_password
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(["GET"])
def product_list(request):
    """
    Retrieves a list of products.
    Can be filtered by category_id using a query parameter.
    Example: /api/products/?category_id=1
    """
    # Get the category_id from the request's query parameters.
    # The .get() method safely returns None if the parameter is not present.
    category_id = request.query_params.get('category_id', None)
    
    # Start with a queryset of all products
    queryset = Product.objects.all()

    # If a category_id is provided, filter the queryset
    if category_id:
        # We can use the filter method on the queryset
        # This will add a WHERE clause to the SQL query
        queryset = queryset.filter(category_id=category_id)
        
    # Serialize the filtered or unfiltered queryset
    serializer = ProductSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(["GET"])
def category_list(request):
    qs = Category.objects.all()
    serializer = CategorySerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)

class SignupView(APIView):
    def post(self, request):
        data = request.data

        required_fields = ["first_name", "last_name", "dob", "email", "password", "confirm_password"]
        if not all(field in data and data[field].strip() for field in required_fields):
            return Response({"detail": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if data["password"] != data["confirm_password"]:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if UserData.objects.filter(email__iexact=data["email"]).exists():
            return Response({"detail": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        hashed = hash_password(data["password"])

        user = UserData.objects.create(
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            dob=data["dob"],
            email=data["email"].lower().strip(),
            password_hash=hashed
        )

        return Response({"message": "Signup successful."}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    """
    POST /api/login/
    expects: { "email": "...", "password": "..." }
    Returns JWT access & refresh on success.
    """
    def post(self, request):
        email = request.data.get("email", "").lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = UserData.objects.get(email__iexact=email)
        except UserData.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not verify_password(password, user.password_hash):
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Create JWT tokens manually (Simple JWT doesn't require Django's auth user)
        refresh = RefreshToken.for_user(user)  # uses user.id under the hood
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        payload = {
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            "access": access_token,
            "refresh": refresh_token,
        }
        return Response(payload, status=status.HTTP_200_OK)
