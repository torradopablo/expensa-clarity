import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, TrendingUp } from "lucide-react";

interface Stats {
  buildingCount: number;
  analysisCount: number;
}

const CommunityStats = () => {
  const [stats, setStats] = useState<Stats>({ buildingCount: 0, analysisCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch building count
        const { count: buildingCount } = await supabase
          .from("building_profiles")
          .select("*", { count: "exact", head: true });

        // Fetch analysis count
        const { count: analysisCount } = await supabase
          .from("expense_analyses")
          .select("*", { count: "exact", head: true });

        setStats({
          buildingCount: buildingCount || 0,
          analysisCount: analysisCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      icon: Building2,
      value: stats.buildingCount,
      label: "Edificios en la comunidad",
      suffix: "+",
    },
    {
      icon: TrendingUp,
      value: stats.analysisCount,
      label: "Análisis realizados",
      suffix: "+",
    },
  ];

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-soft-md">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Comunidad ExpensaCheck</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gradient">
              {loading ? (
                <span className="animate-pulse">--</span>
              ) : (
                <>
                  {item.value.toLocaleString("es-AR")}
                  {item.value > 0 && <span className="text-primary">{item.suffix}</span>}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-4 pt-4 border-t border-border/50">
        Datos en tiempo real de nuestra base
      </p>
    </div>
  );
};

export default CommunityStats;
