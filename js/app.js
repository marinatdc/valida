import { products } from "./data.js";
import {
    calculateProduct,
    calculateProducts,
    calculateScenario,
    generateRecommendation,
    normalizeDiscount
} from "./calculations.js";
import {
    loadWorkflow,
    saveWorkflow,
    clearWorkflow
} from "./storage.js";
import {
    showApp,
    showLogin,
    renderWorker,
    renderManager,
    renderProductModal,
    renderAnalysisModal,
    showModal,
    hideModal,
    switchModal
} from "./ui.js";

let currentRole = null;
let selectedProductId = null;
let pendingAnalysisProductId = null;
let selectedManagerDiscount = null;
let workflow = loadWorkflow();

function now() {
    return new Date().toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function findProduct(productId) {
    return products.find(product => product.id === Number(productId));
}

function getFlow(productId) {
    return workflow[productId] || { status: "NONE" };
}

function setFlow(productId, flow) {
    workflow[productId] = flow;
    saveWorkflow(workflow);
}

function login() {
    currentRole = document.querySelector("#roleSelect").value;
    showApp(currentRole);
    renderApp();
}

function logout() {
    hideModal("productModal");
    hideModal("analysisModal");
    hideModal("rejectModal");

    currentRole = null;
    selectedProductId = null;
    selectedManagerDiscount = null;

    showLogin();
}

function renderApp() {
    const calculated = calculateProducts(products);

    if (currentRole === "worker") {
        renderWorker(calculated, workflow);
    }

    if (currentRole === "manager") {
        renderManager(calculated, workflow);
    }
}

function openProduct(productId) {
    selectedProductId = Number(productId);
    const flow = getFlow(selectedProductId);

    if (currentRole === "manager" && flow.status === "PENDING") {
        selectedManagerDiscount = flow.recommendation.discount;
    } else {
        selectedManagerDiscount = null;
    }

    renderCurrentProduct();
    showModal("productModal");
}

function renderCurrentProduct() {
    if (selectedProductId === null) return;

    const rawProduct = findProduct(selectedProductId);
    const product = calculateProduct(rawProduct);
    const flow = getFlow(selectedProductId);

    let baselineScenario = null;
    let aiScenario = null;
    let selectedScenario = null;

    if (rawProduct.type === "validity") {
        baselineScenario = calculateScenario(rawProduct, 0);

        if (flow.recommendation) {
            aiScenario = calculateScenario(rawProduct, flow.recommendation.discount);
        }

        if (currentRole === "manager" && flow.status === "PENDING") {
            selectedScenario = calculateScenario(rawProduct, selectedManagerDiscount);
        }
    }

    renderProductModal({
        product,
        flow,
        role: currentRole,
        baselineScenario,
        aiScenario,
        selectedScenario,
        selectedDiscount: selectedManagerDiscount
    });
}

function openAnalysis() {
    const rawProduct = findProduct(selectedProductId);
    const product = calculateProduct(rawProduct);

    pendingAnalysisProductId = selectedProductId;
    renderAnalysisModal(product);
    switchModal("productModal", "analysisModal");
}

function cancelAnalysis() {
    pendingAnalysisProductId = null;
    renderCurrentProduct();
    switchModal("analysisModal", "productModal");
}

function confirmAnalysis() {
    if (pendingAnalysisProductId === null) return;

    const productId = pendingAnalysisProductId;
    pendingAnalysisProductId = null;

    createRecommendation(productId, "Encarregado de Estoque");
    renderCurrentProduct();
    switchModal("analysisModal", "productModal");
}

function createRecommendation(productId, requestedBy) {
    const product = findProduct(productId);
    if (!product || product.type !== "validity") return;

    const recommendation = generateRecommendation(product);

    setFlow(productId, {
        status: "PENDING",
        requestedBy,
        requestedAt: now(),
        recommendation
    });

    if (currentRole === "manager") {
        selectedManagerDiscount = recommendation.discount;
    }

    renderApp();
}

function selectDiscount(discount) {
    selectedManagerDiscount = Number(discount);
    renderCurrentProduct();
}

function simulateCustomDiscount() {
    const input = document.querySelector("#customDiscountInput");
    const validation = document.querySelector("#discountValidation");

    if (!input) return;

    const discount = normalizeDiscount(input.value);

    if (discount === null) {
        input.classList.add("is-invalid");
        validation?.classList.remove("d-none");
        return;
    }

    selectedManagerDiscount = discount;
    renderCurrentProduct();
}

function approveRecommendation() {
    if (selectedProductId === null) return;

    const product = findProduct(selectedProductId);
    const flow = getFlow(selectedProductId);

    if (flow.status !== "PENDING") return;

    const approvedDiscount = selectedManagerDiscount ?? flow.recommendation.discount;
    const approvedScenario = calculateScenario(product, approvedDiscount);

    if (!approvedScenario) return;

    setFlow(selectedProductId, {
        ...flow,
        status: "APPROVED",
        approvedDiscount,
        approvedScenario,
        decidedAt: now()
    });

    selectedManagerDiscount = null;
    renderApp();
    renderCurrentProduct();
}

function openReject() {
    switchModal("productModal", "rejectModal");
}

function cancelReject() {
    renderCurrentProduct();
    switchModal("rejectModal", "productModal");
}

function confirmReject() {
    const flow = getFlow(selectedProductId);
    const reason = document.querySelector("#rejectReason").value;

    setFlow(selectedProductId, {
        ...flow,
        status: "REJECTED",
        rejectReason: reason,
        decidedAt: now()
    });

    selectedManagerDiscount = null;
    renderApp();
    renderCurrentProduct();
    switchModal("rejectModal", "productModal");
}

function newAnalysis() {
    if (currentRole === "worker") {
        openAnalysis();
        return;
    }

    createRecommendation(selectedProductId, "Gestor da Loja");
    renderCurrentProduct();
}

function executeRecommendation() {
    const flow = getFlow(selectedProductId);
    if (flow.status !== "APPROVED") return;

    setFlow(selectedProductId, {
        ...flow,
        status: "EXECUTED",
        executedAt: now()
    });

    renderApp();
    renderCurrentProduct();
}

function resetDemo() {
    const confirmed = confirm("Apagar as recomendações e restaurar a demonstração?");
    if (!confirmed) return;

    workflow = {};
    clearWorkflow();
    selectedManagerDiscount = null;

    renderApp();

    if (selectedProductId !== null) {
        renderCurrentProduct();
    }
}

document.addEventListener("click", event => {
    if (event.target.closest("#loginButton")) {
        login();
        return;
    }

    if (event.target.closest("#logoutButton")) {
        logout();
        return;
    }

    if (event.target.closest("#resetDemoButton")) {
        resetDemo();
        return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (actionButton) {
        const action = actionButton.dataset.action;

        if (action === "request-analysis") return openAnalysis();
        if (action === "confirm-analysis") return confirmAnalysis();
        if (action === "cancel-analysis") return cancelAnalysis();

        if (action === "generate-recommendation") {
            createRecommendation(selectedProductId, "Gestor da Loja");
            renderCurrentProduct();
            return;
        }

        if (action === "set-discount") {
            selectDiscount(actionButton.dataset.discount);
            return;
        }

        if (action === "simulate-custom") return simulateCustomDiscount();
        if (action === "approve") return approveRecommendation();
        if (action === "reject") return openReject();
        if (action === "cancel-reject") return cancelReject();
        if (action === "confirm-reject") return confirmReject();
        if (action === "execute") return executeRecommendation();
        if (action === "new-analysis") return newAnalysis();
    }

    const productRow = event.target.closest("[data-product-id]");
    if (productRow) {
        openProduct(productRow.dataset.productId);
    }
});

document.addEventListener("keydown", event => {
    if (event.target.id === "customDiscountInput" && event.key === "Enter") {
        event.preventDefault();
        simulateCustomDiscount();
    }
});
