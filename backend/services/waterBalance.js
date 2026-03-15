/**
 * waterBalance.js
 * ===============
 * Software-based soil water balance engine using the FAO-56 method.
 *
 * Replaces physical soil moisture sensors entirely.
 * Uses OpenWeatherMap data + crop coefficients to calculate:
 *   - ET₀ (reference evapotranspiration, mm/day)
 *   - ETc (crop evapotranspiration = ET₀ × Kc)
 *   - Daily soil water balance
 *   - Irrigation need (mm)
 */

const axios = require("axios");
const WeatherData = require("../models/WeatherData");

const OWM_KEY = process.env.OPENWEATHER_API_KEY;

// ... (CROP_KC and SOIL_WHC remain same)
// ── FAO Crop Coefficients (Kc) per growth stage ───────────────────────────────
// Source: FAO Irrigation and Drainage Paper 56
// p = depletion fraction (fraction of TAW that can be depleted before irrigation)
const CROP_KC = {
    rice: { initial: 1.05, mid: 1.20, late: 0.75, days: [30, 60, 30], p: 0.2 },
    wheat: { initial: 0.30, mid: 1.15, late: 0.40, days: [20, 60, 30], p: 0.55 },
    maize: { initial: 0.30, mid: 1.20, late: 0.60, days: [20, 40, 30], p: 0.55 },
    cotton: { initial: 0.45, mid: 1.15, late: 0.70, days: [30, 50, 55], p: 0.65 },
    sugarcane: { initial: 0.40, mid: 1.25, late: 0.75, days: [35, 105, 70], p: 0.65 },
    potato: { initial: 0.50, mid: 1.15, late: 0.75, days: [25, 30, 30], p: 0.35 },
    tomato: { initial: 0.60, mid: 1.15, late: 0.80, days: [30, 40, 45], p: 0.40 },
    onion: { initial: 0.50, mid: 1.00, late: 0.75, days: [15, 25, 10], p: 0.30 },
    banana: { initial: 0.50, mid: 1.10, late: 1.00, days: [120, 60, 180], p: 0.35 },
    chickpea: { initial: 0.40, mid: 1.00, late: 0.35, days: [20, 35, 15], p: 0.45 },
    mungbean: { initial: 0.40, mid: 1.05, late: 0.60, days: [20, 30, 20], p: 0.45 },
    jute: { initial: 0.40, mid: 1.15, late: 0.50, days: [25, 60, 30], p: 0.30 },
    coffee: { initial: 0.90, mid: 0.95, late: 0.95, days: [30, 90, 30], p: 0.40 },
    default: { initial: 0.40, mid: 1.10, late: 0.60, days: [25, 50, 25], p: 0.50 },
};

// ── Soil water-holding capacities (mm/m) ──────────────────────────────────────
const SOIL_WHC = {
    sandy: 110,   // low water retention
    loamy: 170,   // medium — good for most crops
    clay: 200,   // high retention
    red: 140,
    black: 190,
    default: 160,
};

// ── Irrigation Method Suggestions ───────────────────────────────────────────
// Logic based on crop water requirements and soil drainage
function suggestIrrigationMethod(crop, soilType) {
    const c = crop.toLowerCase();
    const s = soilType?.toLowerCase() || "loamy";

    // Rice and Jute are traditionally flood-irrigated (surface)
    if (c === "rice" || c === "jute") return "Surface (Flood) Irrigation";

    // High value/density crops or sandy soil benefit most from Drip
    if (["tomato", "banana", "coffee", "potato", "onion", "chickpea", "mungbean"].includes(c) || s === "sandy") {
        return "Drip Irrigation";
    }

    // Cereals and loamy soils work well with Sprinklers
    if (["wheat", "maize", "cotton", "sugarcane"].includes(c)) {
        if (s === "clay") return "Drip Irrigation"; // Clay needs slower infiltration
        return "Sprinkler Irrigation";
    }

    return "Drip Irrigation"; // Default to most efficient
}

/**
 * Calculate ET₀ using FAO Penman-Monteith simplified (Hargreaves-Samani variant)
 * that only needs Tmax, Tmin, and latitude (solar radiation is estimated).
 */
function hargreavesET0(Tmax, Tmin, Ra) {
    const Tmean = (Tmax + Tmin) / 2;
    const TD = Tmax - Tmin;
    // Hargreaves-Samani: ET₀ = 0.0023 × (Tmean + 17.8) × TD^0.5 × Ra
    return Math.max(0, 0.0023 * (Tmean + 17.8) * Math.sqrt(TD) * Ra * 0.408);
}

/**
 * Estimate extraterrestrial radiation Ra (MJ/m²/day)
 */
function getExtraterrestrialRadiation(latDeg, doy) {
    const pi = Math.PI;
    const phi = (latDeg * pi) / 180;
    const dr = 1 + 0.033 * Math.cos((2 * pi / 365) * doy);
    const delta = 0.409 * Math.sin((2 * pi / 365) * doy - 1.39);
    const ws = Math.acos(-Math.tan(phi) * Math.tan(delta));
    const Gsc = 0.0820;  // solar constant MJ/m²/min
    const Ra = (24 * 60 / pi) * Gsc * dr *
        (ws * Math.sin(phi) * Math.sin(delta) +
            Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
    return Ra;
}

/**
 * Fetch current + 5-day forecast weather from OpenWeatherMap.
 */
async function fetchWeather(location) {
    if (!OWM_KEY) throw new Error("OPENWEATHER_API_KEY not set");
    const [curRes, foreRes] = await Promise.all([
        axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OWM_KEY}&units=metric`, { timeout: 8000 }),
        axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${OWM_KEY}&units=metric&cnt=40`, { timeout: 8000 }),
    ]);
    return { current: curRes.data, forecast: foreRes.data };
}

/**
 * Calculate the crop's Kc for a given day since planting.
 */
function getKc(crop, daysSincePlanting) {
    const kc = CROP_KC[crop.toLowerCase()] || CROP_KC.default;
    const [d1, d2, d3] = kc.days;
    if (daysSincePlanting <= d1) return kc.initial;
    if (daysSincePlanting <= d1 + d2) return kc.mid;
    if (daysSincePlanting <= d1 + d2 + d3) return kc.late;
    return kc.late;  // post-harvest
}

/**
 * Main function: given a location + crop + planting date + soil type,
 * compute a 7-day irrigation schedule.
 */
async function computeIrrigationSchedule({ location, crop, plantingDate, soilType, fieldSize = 0, rootDepth = 0.5 }) {
    const { current, forecast } = await fetchWeather(location);

    const lat = current.coord.lat;
    const lon = current.coord.lon;
    const now = new Date();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const daysSincePlanting = plantingDate
        ? Math.floor((now - new Date(plantingDate)) / 86400000)
        : 30;

    const Ra = getExtraterrestrialRadiation(lat, doy);
    const whc = SOIL_WHC[soilType?.toLowerCase()] || SOIL_WHC.default;
    const fieldCapacity = whc * rootDepth;

    // Group 5-day forecast into daily Tmax/Tmin/rain buckets
    const dailyMap = {};
    for (const item of forecast.list) {
        const date = item.dt_txt.split(" ")[0];
        if (!dailyMap[date]) dailyMap[date] = { temps: [], rain: 0 };
        dailyMap[date].temps.push(item.main.temp_max, item.main.temp_min);
        dailyMap[date].rain += item.rain?.["3h"] || 0;
    }

    // ── ACCURACY UPGRADE 1: Ground in real-world moisture ────────────────────────
    let soilMoisturePercent = 65; // default fallback
    try {
        const latestInfo = await WeatherData.findOne({ city: new RegExp(`^${location}$`, 'i') }).sort({ createdAt: -1 });
        if (latestInfo && latestInfo.soilMoisture !== undefined) {
            soilMoisturePercent = latestInfo.soilMoisture;
        }
    } catch (e) {
        console.warn("Could not find latest soil data, using default 65%");
    }

    let soilMoisture = (soilMoisturePercent / 100) * fieldCapacity;

    const days = [];
    const dateKeys = Object.keys(dailyMap).slice(0, 7);

    for (let i = 0; i < dateKeys.length; i++) {
        const date = dateKeys[i];
        const d = dailyMap[date];
        const Tmax = Math.max(...d.temps);
        const Tmin = Math.min(...d.temps);
        const dayRain = d.rain;  // mm

        const ET0 = hargreavesET0(Tmax, Tmin, Ra);
        const Kc = getKc(crop, daysSincePlanting + i);
        const ETc = ET0 * Kc;

        // NEW LOGIC: Daily Replenishment Requirement
        // Replenish exactly what was lost (ETc) minus any natural rain
        const dailyReqMm = Math.max(0, ETc - dayRain);
        const dailyReqLiters = fieldSize > 0 ? Math.round(dailyReqMm * fieldSize) : 0;

        // ACCURACY UPGRADE 2: Simulate Runoff (Clamping)
        // Soil cannot hold more than Field Capacity. Excess rain is runoff.
        soilMoisture = Math.min(fieldCapacity, Math.max(0, soilMoisture + dayRain - ETc));

        const p = (CROP_KC[crop.toLowerCase()] || CROP_KC.default).p;
        const MAD = fieldCapacity * (1 - p); // Management Allowed Depletion threshold
        const deficit = Math.max(0, fieldCapacity - soilMoisture);
        
        // ACCURACY UPGRADE 3: Smarter Logic
        // Skip if rain is enough to refill above threshold OR is very significant
        const skipDueToRain = dayRain > 5 && (soilMoisture + dayRain) > MAD;
        const needsIrrigation = soilMoisture < MAD && !skipDueToRain;
        
        const irrigationMm = needsIrrigation ? Math.round(deficit * 10) / 10 : 0;
        const volumeLiters = fieldSize > 0 ? Math.round(irrigationMm * fieldSize) : 0;

        // Calculate the percentage based on the actual soil moisture BEFORE we refill it.
        const moisturePct = Math.min(100, Math.round((soilMoisture / fieldCapacity) * 100));

        // Apply irrigation (refill to field capacity)
        if (needsIrrigation) soilMoisture = fieldCapacity;

        days.push({
            date,
            ET0: Math.round(ET0 * 10) / 10,
            ETc: Math.round(ETc * 10) / 10,
            Kc: Math.round(Kc * 100) / 100,
            rainfall: Math.round(dayRain * 10) / 10,
            soilMoisture: moisturePct,
            dailyReqMm: Math.round(dailyReqMm * 10) / 10,
            dailyReqLiters,
            irrigationMm,
            volumeLiters,
            suggestedMethod: suggestIrrigationMethod(crop, soilType),
            needsIrrigation,
            action: needsIrrigation
                ? `💧 Critical: Irrigate ${irrigationMm}mm (${volumeLiters}L)`
                : dailyReqLiters > 0
                    ? `🌿 Replenish ${dailyReqLiters}L (Daily ET loss)`
                    : dayRain > 10
                        ? `🌧️ Rain expected (${Math.round(dayRain)}mm) — skip`
                        : moisturePct > 90
                            ? `✅ Sufficient (Soil at ${moisturePct}%)`
                            : `✅ Sufficient moisture`,
        });
    }

    const totalIrrigationMm = Math.round(days.reduce((s, d) => s + d.irrigationMm, 0) * 10) / 10;
    const totalVolumeLiters = fieldSize > 0 ? Math.round(totalIrrigationMm * fieldSize) : 0;
    const totalETReplenishmentLiters = days.reduce((s, d) => s + d.dailyReqLiters, 0);

    return {
        location,
        crop,
        soilType,
        fieldSize,
        daysSincePlanting,
        currentGrowthStage: getGrowthStage(crop, daysSincePlanting),
        schedule: days,
        totalIrrigationNeeded: totalIrrigationMm,
        totalVolumeLiters,
        totalETReplenishmentLiters,
        suggestedIrrigationType: suggestIrrigationMethod(crop, soilType),
        waterSavedVsFlood: estimateFloodWaste(days),
    };
}

function getGrowthStage(crop, days) {
    const kc = CROP_KC[crop.toLowerCase()] || CROP_KC.default;
    const [d1, d2, d3] = kc.days;
    if (days <= d1) return { stage: "Initial", emoji: "🌱", pct: Math.round((days / d1) * 100) };
    if (days <= d1 + d2) return { stage: "Mid-season", emoji: "🌿", pct: Math.round(((days - d1) / d2) * 100) };
    if (days <= d1 + d2 + d3) return { stage: "Late", emoji: "🌾", pct: Math.round(((days - d1 - d2) / d3) * 100) };
    return { stage: "Harvest", emoji: "🏆", pct: 100 };
}

function estimateFloodWaste(days) {
    const floodTotal = days.length * 8;
    const smartTotal = days.reduce((s, d) => s + d.irrigationMm, 0);
    return Math.max(0, Math.round(floodTotal - smartTotal));
}

module.exports = { computeIrrigationSchedule, hargreavesET0, getKc, getGrowthStage };

