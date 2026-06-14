"use client";

import type { Map as LeafletMapInstance, Marker } from "leaflet";
import { ChevronDown, MapPinned } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Coordinates, Restaurant } from "@/lib/places";

type LeafletMapProps = {
  currentLocation: Coordinates;
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
  radiusKm: number;
};

function zoomForRadius(radiusKm: number) {
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 3) return 14;
  return 13;
}

export default function LeafletMap({
  currentLocation,
  restaurants,
  selectedRestaurantId,
  radiusKm,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const restaurantMarkersRef = useRef<Map<string, Marker>>(new Map());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function createMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [currentLocation.latitude, currentLocation.longitude],
        zoom: zoomForRadius(radiusKm),
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.circleMarker([currentLocation.latitude, currentLocation.longitude], {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2f7d65",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("現在地", { permanent: false, direction: "top" });

      restaurants.forEach((restaurant, index) => {
        const icon = L.divIcon({
          className: "restaurant-map-marker",
          html: `<span><b>${index + 1}</b></span>`,
          iconSize: [36, 44],
          iconAnchor: [18, 42],
          popupAnchor: [0, -38],
        });
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        const distance = document.createElement("span");
        name.textContent = restaurant.name;
        distance.textContent = `現在地から ${restaurant.distanceKm < 1 ? `${Math.round(restaurant.distanceKm * 1000)}m` : `${restaurant.distanceKm.toFixed(1)}km`}`;
        popup.className = "restaurant-map-popup";
        popup.append(name, distance);

        const marker = L.marker([restaurant.latitude, restaurant.longitude], { icon })
          .addTo(map)
          .bindPopup(popup);
        restaurantMarkersRef.current.set(restaurant.id, marker);
      });

      mapRef.current = map;
    }

    void createMap();

    return () => {
      cancelled = true;
      restaurantMarkersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [currentLocation, radiusKm, restaurants]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRestaurantId) return;

    const marker = restaurantMarkersRef.current.get(selectedRestaurantId);
    if (!marker) return;

    setIsOpen(true);
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.6 });
    marker.openPopup();
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => mapRef.current?.invalidateSize());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-forest/10 bg-white shadow-[0_10px_35px_rgba(31,74,62,0.10)]">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left lg:pointer-events-none"
      >
        <span className="flex items-center gap-2 text-sm font-black text-ink">
          <MapPinned className="size-5 text-coral" />
          現在地周辺の地図
        </span>
        <span className="flex items-center gap-1 text-xs font-black text-leaf lg:hidden">
          {isOpen ? "閉じる" : "地図を表示"}
          <ChevronDown className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div className={`${isOpen ? "block" : "hidden"} border-t border-forest/10 lg:block`}>
        <div ref={containerRef} className="h-[320px] w-full sm:h-[380px] lg:h-[360px]" aria-label="現在地と検索結果の店舗地図" />
      </div>
    </section>
  );
}
