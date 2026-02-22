import { AnalysisRepository } from "../database/AnalysisRepository.ts";
import { BuildingRepository } from "../database/BuildingRepository.ts";
import { TrendService } from "./TrendService.ts";
import { DeviationAnalysisService } from "./DeviationAnalysisService.ts";
import { buildPeriodDate } from "../../utils/date.utils.ts";

export class EvolutionInsightService {
    private analysisRepo: AnalysisRepository;
    private buildingRepo: BuildingRepository;
    private trendService: TrendService;
    private deviationService: DeviationAnalysisService;

    constructor(authHeader?: string) {
        this.analysisRepo = new AnalysisRepository(authHeader);
        this.buildingRepo = new BuildingRepository(authHeader);
        this.trendService = new TrendService(authHeader);
        this.deviationService = new DeviationAnalysisService();
    }

    async generateAndSaveAnalysis(userId: string, buildingName: string, analysisId: string) {
        try {
            console.log(`Generating automated evolution analysis for building: ${buildingName}, analysis: ${analysisId}`);

            // 1. Fetch user analyses for this building to build user trend
            const { data: userAnalyses, error: userError } = await this.analysisRepo.getUserAnalyses(userId, buildingName);
            if (userError || !userAnalyses || userAnalyses.length < 2) {
                console.log("Not enough user analyses for trend analysis");
                return null;
            }

            // 2. Fetch building profile for filtering market trend
            const { data: profile } = await this.buildingRepo.getBuildingProfile(userId, buildingName);

            // 3. Fetch inflation and market trends
            const [inflationResult, marketResult] = await Promise.all([
                this.trendService.getInflationData(),
                this.trendService.getMarketTrend({
                    unit_count_range: profile?.unit_count_range || undefined,
                    age_category: profile?.age_category || undefined,
                    neighborhood: profile?.neighborhood || undefined,
                    city: profile?.city || undefined,
                    zone: profile?.zone || undefined,
                    has_amenities: profile?.has_amenities || undefined
                })
            ]);

            if (inflationResult.error || !inflationResult.data || !marketResult.data) {
                console.error("Error fetching comparison data");
                return null;
            }

            // 4. Prepare data for DeviationAnalysisService
            const chartData = userAnalyses.map((a: any) => ({
                period: a.period as string,
                periodDate: a.period_date as string | null,
                total: a.total_amount as number,
            }));

            const baseUserValue = chartData[0].total;
            if (baseUserValue === 0) return null;

            const inflationMap = new Map(inflationResult.data.map((d: any) => [d.period, d]));
            const marketMap = new Map((marketResult.data as any[]).map((d: any) => [d.period, d]));

            const firstUserPeriod = this.periodToYYYYMM(chartData[0].periodDate, chartData[0].period);
            const baseInflation = firstUserPeriod ? inflationMap.get(firstUserPeriod) as any : null;
            const baseMarketData = marketResult.data.find((b: any) => b.period === chartData[0].period) as any;
            const baseNormalizedMarket = baseMarketData?.normalizedPercent ?? 0;

            const userTrend = chartData.map((item: any) => ({
                period: item.period,
                percent: ((item.total - baseUserValue) / baseUserValue) * 100
            }));

            const inflationTrend = chartData.map((item: any) => {
                const periodYYYYMM = this.periodToYYYYMM(item.periodDate, item.period);
                const inflationItem = periodYYYYMM ? inflationMap.get(periodYYYYMM) as any : null;
                if (inflationItem && baseInflation) {
                    return {
                        period: item.period,
                        percent: ((inflationItem.value - baseInflation.value) / baseInflation.value) * 100
                    };
                }
                return null;
            }).filter((t: any): t is { period: string; percent: number } => t !== null);

            const buildingsTrend = chartData.map((item: any) => {
                const marketItem = marketMap.get(item.period) as any;
                if (marketItem) {
                    return {
                        period: item.period,
                        percent: marketItem.normalizedPercent - baseNormalizedMarket
                    };
                }
                return null;
            }).filter((t: any): t is { period: string; percent: number } => t !== null);

            // 5. Generate AI Analysis
            const { analysis, deviation } = await this.deviationService.analyzeDeviations({
                userTrend,
                inflationTrend,
                buildingsTrend,
                buildingName,
                appliedFilters: marketResult.stats?.appliedFilters
            });

            // 6. Save to database
            if (analysis) {
                await this.analysisRepo.updateAnalysis(analysisId, {
                    evolution_analysis: analysis,
                    deviation_stats: deviation
                } as any);
                console.log("Persistence successful");
            }

            return { analysis, deviation };
        } catch (error) {
            console.error("Error in generateAndSaveAnalysis:", error);
            return null;
        }
    }

    private periodToYYYYMM(periodDate: string | null, period: string): string | null {
        if (periodDate) {
            const date = new Date(periodDate);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        // Fallback to parsing period string if no period_date
        const parts = period.toLowerCase().trim().split(/\s+/);
        const monthsEs: Record<string, number> = {
            enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
            julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
        };
        if (parts.length >= 2) {
            const month = monthsEs[parts[0]];
            if (month !== undefined) {
                const year = parseInt(parts[1]) || new Date().getFullYear();
                return `${year}-${String(month + 1).padStart(2, '0')}`;
            }
        }
        return null;
    }
}
