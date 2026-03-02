import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation, ExternalLink, Loader2, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ReverseGeoData {
  street?: string;
  houseNumber?: string;
  neighbourhood?: string;
  crossStreet1?: string;
  crossStreet2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  formattedAddress?: string;
}

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  onAddressData?: (data: ReverseGeoData) => void;
  onGeocodingIncomplete?: () => void;
  /** Whether the address was auto-filled by GPS */
  addressAutoFilled?: boolean;
}

const LOCATION_REGEX = /^-?\d+\.?\d*,-?\d+\.?\d*$/;

function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseLocation(value: string): { lat: number; lng: number } | null {
  const trimmed = value.trim().replace(/\s/g, '');
  if (!LOCATION_REGEX.test(trimmed)) return null;
  const [latStr, lngStr] = trimmed.split(',');
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (!validateCoordinates(lat, lng)) return null;
  return { lat, lng };
}

function formatLocation(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return '';
  return `${lat},${lng}`;
}

// Enhanced reverse geocoding using Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeoData | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es&zoom=18`,
      { headers: { 'User-Agent': 'OpticaIstmena/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const result: ReverseGeoData = {};
    result.street = addr.road || addr.pedestrian || addr.footway || undefined;
    result.houseNumber = addr.house_number || undefined;
    result.neighbourhood = addr.neighbourhood || addr.suburb || addr.hamlet || addr.village || undefined;
    result.city = addr.city || addr.town || addr.village || addr.municipality || undefined;
    result.state = addr.state || undefined;
    result.zipCode = addr.postcode || undefined;

    return result;
  } catch {
    return null;
  }
}

// Find nearby cross streets using Overpass API
async function findCrossStreets(lat: number, lng: number, mainStreet?: string): Promise<{ cross1?: string; cross2?: string }> {
  try {
    // Query for roads within ~50m radius
    const query = `
      [out:json][timeout:5];
      way(around:50,${lat},${lng})["highway"]["name"];
      out tags;
    `;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) return {};
    const data = await res.json();

    const streetNames = new Set<string>();
    for (const el of data.elements || []) {
      const name = el.tags?.name;
      if (name && name !== mainStreet) {
        streetNames.add(name);
      }
    }

    const streets = Array.from(streetNames);
    return {
      cross1: streets[0] || undefined,
      cross2: streets[1] || undefined,
    };
  } catch {
    return {};
  }
}

// Build formatted address string (street + number only, colonia goes in separate field)
function buildFormattedAddress(data: ReverseGeoData): string {
  if (data.street) {
    return data.houseNumber ? `${data.street} #${data.houseNumber}` : data.street;
  }
  return '';
}

export function LocationPicker({ latitude, longitude, onLocationChange, onAddressData, onGeocodingIncomplete, addressAutoFilled }: LocationPickerProps) {
  const [inputValue, setInputValue] = useState(formatLocation(latitude, longitude));
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);
  const [accuracyWarning, setAccuracyWarning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const formatted = formatLocation(latitude, longitude);
    if (formatted !== inputValue && formatted !== '') {
      setInputValue(formatted);
    }
  }, [latitude, longitude]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setError(null);
    setGeoWarning(null);
    setAccuracyWarning(null);
    if (!value.trim()) {
      onLocationChange(null, null);
      return;
    }
  };

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      setError(null);
      return;
    }
    const parsed = parseLocation(inputValue);
    if (parsed) {
      onLocationChange(parsed.lat, parsed.lng);
      setInputValue(formatLocation(parsed.lat, parsed.lng));
      setError(null);
    } else {
      setError('Formato inválido. Ej: 16.4312,-95.0223');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Tu navegador no soporta geolocalización', variant: 'destructive' });
      return;
    }

    setIsLoadingLocation(true);
    setError(null);
    setGeoWarning(null);
    setAccuracyWarning(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const formatted = formatLocation(lat, lng);
        setInputValue(formatted);
        onLocationChange(lat, lng);

        // Check GPS accuracy
        if (accuracy > 40) {
          setAccuracyWarning(`⚠ Ubicación aproximada (~${Math.round(accuracy)}m), confirmar referencia.`);
        }

        // Reverse geocode
        const geoData = await reverseGeocode(lat, lng);

        if (geoData && (geoData.street || geoData.neighbourhood)) {
          // Find cross streets via Overpass
          const crossStreets = await findCrossStreets(lat, lng, geoData.street);
          geoData.crossStreet1 = crossStreets.cross1;
          geoData.crossStreet2 = crossStreets.cross2;

          // Build formatted address
          geoData.formattedAddress = buildFormattedAddress(geoData);

          onAddressData?.(geoData);
          toast({ title: 'Ubicación obtenida', description: `Dirección autocompletada por GPS` });
        } else {
          setGeoWarning('GPS no devolvió dirección completa. Captura dirección manualmente.');
          onGeocodingIncomplete?.();
          toast({ title: 'Ubicación obtenida', description: 'Coordenadas capturadas. Completa la dirección manualmente.' });
        }

        setIsLoadingLocation(false);
      },
      (geoError) => {
        setIsLoadingLocation(false);
        let message = 'No se pudo obtener la ubicación';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = 'Permiso de ubicación denegado. Activa el permiso en tu navegador.';
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = 'Ubicación no disponible. Verifica tu conexión GPS.';
        } else if (geoError.code === geoError.TIMEOUT) {
          message = 'Tiempo de espera agotado. Intenta de nuevo.';
        }
        toast({ title: 'Error de ubicación', description: message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const isValidLocation = latitude !== null && longitude !== null && validateCoordinates(latitude, longitude);
  const googleMapsUrl = isValidLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Ubicación (lat,long)
        </Label>
        <Input
          id="location"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="16.431213625000005,-95.0223"
          className={error ? 'border-destructive' : ''}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Formato: latitud,longitud (ej. 16.4312,-95.0223)
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={isLoadingLocation}
          className="gap-2"
        >
          {isLoadingLocation ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Obteniendo ubicación y dirección...
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              Obtener Ubicación
            </>
          )}
        </Button>
      </div>

      {/* GPS accuracy warning */}
      {accuracyWarning && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span>{accuracyWarning}</span>
        </div>
      )}

      {/* Geocoding incomplete warning */}
      {geoWarning && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-accent/50 border border-accent text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span>{geoWarning}</span>
        </div>
      )}

      {/* Auto-filled indicator */}
      {addressAutoFilled && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Dirección autocompletada por GPS</span>
        </div>
      )}

      {isValidLocation && googleMapsUrl && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="gap-1 p-0 h-auto text-primary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          <ExternalLink className="h-3 w-3" />
          Abrir en Google Maps
        </Button>
      )}

      {!isValidLocation && !error && inputValue === '' && (
        <p className="text-xs text-muted-foreground">
          Recomendamos capturar la ubicación para facilitar visitas de cobranza
        </p>
      )}
    </div>
  );
}
