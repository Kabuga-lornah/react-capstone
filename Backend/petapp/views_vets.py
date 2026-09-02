from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .vet_service import (
    VetLookupError,
    VetLookupUnavailable,
    find_nearby_vet_clinics,
)


class NearbyVetClinicsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            lat = float(request.query_params.get("lat"))
            lng = float(request.query_params.get("lng"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "lat and lng query parameters are required and must be numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        radius_param = request.query_params.get("radius")
        try:
            radius_meters = int(radius_param) if radius_param else 5000
        except ValueError:
            radius_meters = 5000

        try:
            clinics = find_nearby_vet_clinics(lat, lng, radius_meters)
        except VetLookupUnavailable as error:
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except VetLookupError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"results": clinics}, status=status.HTTP_200_OK)
