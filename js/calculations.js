import { simulatedUplift } from "./data.js";

export function normalizeDiscount(value) {
    const discount = Number(value);
    if (Number.isNaN(discount)) return null;
    if (discount < 0 || discount > 90) return null;
    return discount;
}

export function calculateValidityProduct(product) {
    const expectedSales = Math.min(
        product.stock,
        Math.floor(product.dailySales * product.days)
    );

    const leftover = Math.max(product.stock - expectedSales, 0);
    const estimatedLoss = leftover * product.cost;
    const margin = product.price - product.cost;

    let severity = "low";

    if (leftover > 0 && (product.days <= 4 || leftover >= 15)) {
        severity = "high";
    } else if (leftover > 0 && (product.days <= 6 || leftover >= 8)) {
        severity = "medium";
    }

    return {
        ...product,
        expectedSales,
        leftover,
        estimatedLoss,
        margin,
        severity,
        situation: "validity"
    };
}

export function calculateRuptureProduct(product) {
    const coverageDays = product.stock / product.dailySales;
    const ruptureGap = Math.max(product.nextRestockDays - coverageDays, 0);

    return {
        ...product,
        coverageDays,
        ruptureGap,
        leftover: null,
        estimatedLoss: 0,
        severity: "rupture",
        situation: "rupture"
    };
}

export function calculateProduct(product) {
    return product.type === "rupture"
        ? calculateRuptureProduct(product)
        : calculateValidityProduct(product);
}

export function calculateProducts(products) {
    return products.map(calculateProduct);
}

export function estimateUplift(category, discount) {
    if (discount <= 0) return 0;

    const points = simulatedUplift[category] || {
        10: 0.10,
        20: 0.25,
        30: 0.45
    };

    if (discount <= 10) {
        return points[10] * (discount / 10);
    }

    if (discount <= 20) {
        const progress = (discount - 10) / 10;
        return points[10] + (points[20] - points[10]) * progress;
    }

    if (discount <= 30) {
        const progress = (discount - 20) / 10;
        return points[20] + (points[30] - points[20]) * progress;
    }

    const base = points[30];
    const maximum = Math.max(base + 0.45, base * 1.8);
    const extraDiscount = discount - 30;
    const saturation = 1 - Math.exp(-extraDiscount / 25);

    return base + (maximum - base) * saturation;
}

export function calculateScenario(product, discount) {
    discount = normalizeDiscount(discount);
    if (discount === null) return null;

    const current = calculateValidityProduct(product);
    const uplift = estimateUplift(product.category, discount);
    const promoPrice = product.price * (1 - discount / 100);
    const promoMargin = promoPrice - product.cost;
    const projectedDaily = product.dailySales * (1 + uplift);
    const projectedSales = Math.min(
        product.stock,
        Math.floor(projectedDaily * product.days)
    );
    const leftover = Math.max(product.stock - projectedSales, 0);
    const loss = leftover * product.cost;
    const salesMargin = projectedSales * promoMargin;
    const result = salesMargin - loss;

    return {
        discount,
        uplift,
        promoPrice,
        promoMargin,
        projectedDaily,
        projectedSales,
        leftover,
        loss,
        salesMargin,
        result,
        belowCost: promoPrice < product.cost
    };
}

export function generateRecommendation(product) {
    const scenarios = [0, 10, 20, 30]
        .map(discount => calculateScenario(product, discount))
        .filter(scenario => scenario && !scenario.belowCost);

    const baseline = scenarios.find(scenario => scenario.discount === 0);
    const best = scenarios.reduce((currentBest, scenario) =>
        scenario.result > currentBest.result ? scenario : currentBest
    );

    const explanation = best.discount === 0
        ? "Entre os cenários analisados, manter o preço apresentou o melhor resultado estimado."
        : `Entre os cenários analisados, ${best.discount}% apresentou o melhor equilíbrio entre redução da perda e preservação da margem.`;

    return {
        discount: best.discount,
        promoPrice: best.promoPrice,
        promoMargin: best.promoMargin,
        projectedSales: best.projectedSales,
        leftoverBefore: baseline.leftover,
        leftoverAfter: best.leftover,
        lossBefore: baseline.loss,
        lossAfter: best.loss,
        resultBefore: baseline.result,
        resultAfter: best.result,
        explanation
    };
}
