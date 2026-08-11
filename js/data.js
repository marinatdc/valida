export const products = [
    {
        id: 1,
        name: "Iogurte Natural 170g",
        ean: "7891000100103",
        category: "Laticínios",
        type: "validity",
        stock: 40,
        days: 5,
        expiry: "15/08/2026",
        dailySales: 3,
        cost: 3.00,
        price: 5.00
    },
    {
        id: 2,
        name: "Queijo Mussarela 400g",
        ean: "7891000315507",
        category: "Frios",
        type: "validity",
        stock: 31,
        days: 4,
        expiry: "14/08/2026",
        dailySales: 4,
        cost: 12.20,
        price: 18.90
    },
    {
        id: 3,
        name: "Pão de Forma Tradicional",
        ean: "7896004400037",
        category: "Padaria",
        type: "validity",
        stock: 35,
        days: 3,
        expiry: "13/08/2026",
        dailySales: 8,
        cost: 5.20,
        price: 8.90
    },
    {
        id: 4,
        name: "Salada Pronta 250g",
        ean: "7898925694017",
        category: "Hortifruti",
        type: "validity",
        stock: 18,
        days: 2,
        expiry: "12/08/2026",
        dailySales: 4,
        cost: 7.40,
        price: 12.00
    },
    {
        id: 5,
        name: "Suco Natural Laranja 1L",
        ean: "7894900011517",
        category: "Bebidas",
        type: "validity",
        stock: 28,
        days: 6,
        expiry: "16/08/2026",
        dailySales: 3,
        cost: 6.10,
        price: 9.90
    },
    {
        id: 6,
        name: "Requeijão Cremoso 200g",
        ean: "7891150018730",
        category: "Laticínios",
        type: "validity",
        stock: 20,
        days: 7,
        expiry: "17/08/2026",
        dailySales: 2,
        cost: 5.30,
        price: 8.49
    },
    {
        id: 7,
        name: "Leite Integral 1L",
        ean: "7891000053508",
        category: "Laticínios",
        type: "rupture",
        stock: 24,
        dailySales: 6,
        nextRestockDays: 6,
        cost: 3.70,
        price: 5.20
    }
];

export const simulatedUplift = {
    "Laticínios": { 10: 0.20, 20: 0.50, 30: 0.80 },
    "Frios": { 10: 0.18, 20: 0.45, 30: 0.50 },
    "Padaria": { 10: 0.25, 20: 0.55, 30: 0.75 },
    "Bebidas": { 10: 0.05, 20: 0.10, 30: 0.15 },
    "Hortifruti": { 10: 0.25, 20: 0.60, 30: 1.00 }
};
