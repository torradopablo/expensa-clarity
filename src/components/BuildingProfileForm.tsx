import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, Users, Dumbbell, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BuildingProfile {
  id?: string;
  building_name: string;
  unit_count_range: string | null;
  has_amenities: boolean;
  amenities: string[];
  construction_year: number | null;
  age_category: string | null;
  neighborhood: string | null;
  city: string;
  zone: string | null;
}

interface BuildingProfileFormProps {
  buildingName: string;
  onSave?: (profile: BuildingProfile) => void;
  onCancel?: () => void;
  compact?: boolean;
}

const UNIT_RANGES = [
  { value: "1-20", label: "1 a 20 unidades" },
  { value: "21-50", label: "21 a 50 unidades" },
  { value: "51-100", label: "51 a 100 unidades" },
  { value: "101-200", label: "101 a 200 unidades" },
  { value: "200+", label: "Más de 200 unidades" },
];

const AGE_CATEGORIES = [
  { value: "nuevo", label: "Nuevo (0-5 años)" },
  { value: "moderno", label: "Moderno (6-20 años)" },
  { value: "clasico", label: "Clásico (21-50 años)" },
  { value: "antiguo", label: "Antiguo (50+ años)" },
];

const ZONES = [
  { value: "norte", label: "Zona Norte" },
  { value: "sur", label: "Zona Sur" },
  { value: "centro", label: "Centro" },
  { value: "oeste", label: "Zona Oeste" },
];

const AMENITIES_OPTIONS = [
  { value: "pileta", label: "Pileta" },
  { value: "gimnasio", label: "Gimnasio" },
  { value: "sum", label: "SUM" },
  { value: "seguridad", label: "Seguridad 24hs" },
  { value: "quincho", label: "Quincho" },
  { value: "solarium", label: "Solarium" },
  { value: "laundry", label: "Laundry" },
  { value: "bicicletas", label: "Bicicletero" },
  { value: "cocheras", label: "Cocheras" },
  { value: "jardin", label: "Jardín/Parque" },
];

export function BuildingProfileForm({ buildingName, onSave, onCancel, compact = false }: BuildingProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BuildingProfile>({
    building_name: buildingName,
    unit_count_range: null,
    has_amenities: false,
    amenities: [],
    construction_year: null,
    age_category: null,
    neighborhood: null,
    city: "Buenos Aires",
    zone: null,
  });

  useEffect(() => {
    loadExistingProfile();
  }, [buildingName]);

  const loadExistingProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("building_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("building_name", buildingName)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          id: data.id,
          building_name: data.building_name,
          unit_count_range: data.unit_count_range,
          has_amenities: data.has_amenities || false,
          amenities: data.amenities || [],
          construction_year: data.construction_year,
          age_category: data.age_category,
          neighborhood: data.neighborhood,
          city: data.city || "Buenos Aires",
          zone: data.zone,
        });
      }
    } catch (error) {
      console.error("Error loading building profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setProfile(prev => {
      const newAmenities = prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity];
      
      return {
        ...prev,
        amenities: newAmenities,
        has_amenities: newAmenities.length > 0,
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión");
        return;
      }

      const profileData = {
        user_id: user.id,
        building_name: buildingName,
        unit_count_range: profile.unit_count_range,
        has_amenities: profile.has_amenities,
        amenities: profile.amenities,
        construction_year: profile.construction_year,
        age_category: profile.age_category,
        neighborhood: profile.neighborhood,
        city: profile.city,
        zone: profile.zone,
      };

      if (profile.id) {
        const { error } = await supabase
          .from("building_profiles")
          .update(profileData)
          .eq("id", profile.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("building_profiles")
          .insert(profileData)
          .select()
          .single();
        
        if (error) throw error;
        setProfile(prev => ({ ...prev, id: data.id }));
      }

      toast.success("Perfil del edificio guardado");
      onSave?.(profile);
    } catch (error: any) {
      console.error("Error saving building profile:", error);
      toast.error("Error al guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? "border-dashed border-muted-foreground/30" : ""}>
      <CardHeader className={compact ? "pb-3" : ""}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className={compact ? "text-base" : ""}>
              Perfil del Edificio
            </CardTitle>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Completa la información para comparaciones más precisas con edificios similares
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unit Count */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Cantidad de unidades
          </Label>
          <Select
            value={profile.unit_count_range || ""}
            onValueChange={(value) => setProfile(prev => ({ ...prev, unit_count_range: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar rango" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age Category */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Antigüedad del edificio
          </Label>
          <Select
            value={profile.age_category || ""}
            onValueChange={(value) => setProfile(prev => ({ ...prev, age_category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar antigüedad" />
            </SelectTrigger>
            <SelectContent>
              {AGE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Barrio
            </Label>
            <Input
              placeholder="Ej: Palermo"
              value={profile.neighborhood || ""}
              onChange={(e) => setProfile(prev => ({ ...prev, neighborhood: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Zona</Label>
            <Select
              value={profile.zone || ""}
              onValueChange={(value) => setProfile(prev => ({ ...prev, zone: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {ZONES.map(zone => (
                  <SelectItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            Amenities
          </Label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_OPTIONS.map(amenity => (
              <Badge
                key={amenity.value}
                variant={profile.amenities.includes(amenity.value) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => handleAmenityToggle(amenity.value)}
              >
                {profile.amenities.includes(amenity.value) && "✓ "}
                {amenity.label}
              </Badge>
            ))}
          </div>
          {profile.amenities.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Click en los amenities que tiene tu edificio
            </p>
          )}
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Perfil
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
