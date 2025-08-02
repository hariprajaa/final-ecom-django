#fields that you want to expose in the API from db models
from rest_framework import serializers
from .models import Product,Category,UserData

from .models import UserData
from .utils.password_utils import hash_password
from datetime import date
from products.utils.password_utils import hash_password, verify_password


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "image_url", "description"]  # include description if you want it too



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserData
        exclude = ["password_hash"]

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = UserData
        fields = [
            "first_name",
            "last_name",
            "dob",
            "email",
            "password",
            "confirm_password",
        ]

    def validate_email(self, value):
        if UserData.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email is already registered.")
        return value.lower()

    def validate_dob(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        raw_password = validated_data.pop("password")
        hashed = hash_password(raw_password)
        user = UserData.objects.create(password_hash=hashed, **validated_data)
        return user