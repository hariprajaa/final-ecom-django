from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from .models import Product, Category, UserData
from .serializers import ProductSerializer, CategorySerializer, UserSerializer
from .utils.password_utils import hash_password, verify_password
from rest_framework_simplejwt.tokens import RefreshToken
from elasticsearch import Elasticsearch
import re
from django.dispatch import receiver
from django.db.models.signals import post_save

es = Elasticsearch(
    "https://localhost:9200",
    basic_auth=("elastic", "98pqqnnYuP45sJrfCKna"),  # use your ES password
    verify_certs=False
)

@receiver(post_save, sender=Product)
def index_product_in_es(sender, instance, **kwargs):
    es.index(
        index="products",
        id=instance.id,
        document={
            "name": instance.name,
            "description": instance.description,
            "price": float(instance.price),
            "category_name": instance.category.name,
            "category_id": instance.category_id,
        }
    )

# ✅ This was missing earlier
@api_view(["GET"])
def product_list(request):
    """
    Retrieves a list of products.
    Can be filtered by category_id using a query parameter.
    Example: /api/products/?category_id=1
    """
    category_id = request.query_params.get('category_id')
    queryset = Product.objects.all()
    if category_id:
        queryset = queryset.filter(category_id=category_id)
    serializer = ProductSerializer(queryset, many=True)
    return Response(serializer.data)



@api_view(["GET"])
def category_list(request):
    """
    Returns all categories.
    """
    qs = Category.objects.all()
    serializer = CategorySerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
def product_search(request):
    q_raw = request.query_params.get("q", "").strip()
    category_id = request.query_params.get("category_id")
    try:
        page = int(request.query_params.get("page", "1"))
    except ValueError:
        page = 1
    page_size = 9

    # Parse price constraints from query
    max_price = None
    min_price = None
    q = q_raw.lower().replace("₹", "").replace(",", "")

    m = re.search(r"between\s+(\d+\.?\d*)\s+(?:and|to)\s+(\d+\.?\d*)", q)
    if m:
        min_price = float(m.group(1))
        max_price = float(m.group(2))
        q = re.sub(m.group(0), "", q)
    else:
        m = re.search(r"(?:under|below)\s+(\d+\.?\d*)", q)
        if m:
            max_price = float(m.group(1))
            q = re.sub(m.group(0), "", q)
        m2 = re.search(r"(?:over|above|more than)\s+(\d+\.?\d*)", q)
        if m2:
            min_price = float(m2.group(1))
            q = re.sub(m2.group(0), "", q)

    q = q.strip()

    must_clauses = []
    if q:
        must_clauses.append({
            "multi_match": {
                "query": q,
                "fields": ["name^3", "description", "category_name^2"],
                "fuzziness": "AUTO"
            }
        })
    if category_id:
        try:
            cid_int = int(category_id)
            must_clauses.append({"term": {"category_id": cid_int}})
        except ValueError:
            pass

    filter_clauses = []
    price_range = {}
    if min_price is not None:
        price_range["gte"] = min_price
    if max_price is not None:
        price_range["lte"] = max_price
    if price_range:
        filter_clauses.append({"range": {"price": price_range}})

    bool_query = {}
    if must_clauses:
        bool_query["must"] = must_clauses
    if filter_clauses:
        bool_query["filter"] = filter_clauses

    if bool_query:
        body = {"query": {"bool": bool_query}}
    else:
        body = {"query": {"match_all": {}}}

    start = (page - 1) * page_size

    try:
        response = es.search(index="products", body=body, from_=start, size=page_size)
    except Exception:
        # fallback to DB search
        qs = Product.objects.all()
        if category_id:
            qs = qs.filter(category_id=category_id)
        if q:
            qs = qs.filter(name__icontains=q) | qs.filter(description__icontains=q)
        if min_price is not None:
            qs = qs.filter(price__gte=min_price)
        if max_price is not None:
            qs = qs.filter(price__lte=max_price)
        total = qs.count()
        serializer = ProductSerializer(qs, many=True)
        return Response({
            "results": serializer.data,
            "total": total,
            "page": page,
            "pages": (total + page_size - 1) // page_size,
        })

    hits = response.get("hits", {}).get("hits", [])
    ids = [int(hit["_id"]) for hit in hits]
    products_qs = Product.objects.filter(product_id__in=ids)
    products_ordered = sorted(products_qs, key=lambda p: ids.index(p.product_id)) if ids else []
    serializer = ProductSerializer(products_ordered, many=True)

    total_info = response.get("hits", {}).get("total", {})
    total = total_info.get("value") if isinstance(total_info, dict) else len(ids)
    if total is None:
        total = len(ids)
    pages = (total + page_size - 1) // page_size if total else 1

    return Response({
        "results": serializer.data,
        "total": total,
        "page": page,
        "pages": pages,
    })


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
    def post(self, request):
        email = request.data.get("email", "").lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = UserData.objects.get(email__iexact=email)
        except UserData.DoesNotExist:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not verify_password(password, user.password_hash):
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
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
