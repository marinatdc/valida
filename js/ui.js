const money = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

export function formatMoney(value) {
    return money.format(value);
}

export function formatDiscount(discount) {
    const number = Number(discount);
    return Number.isInteger(number)
        ? number.toString()
        : number.toFixed(1).replace(".", ",");
}

export function actionLabel(discount) {
    return Number(discount) === 0
        ? "Manter preço"
        : `Promoção de ${formatDiscount(discount)}%`;
}

export function showApp(role) {
    document.querySelector("#loginScreen").classList.add("d-none");
    document.querySelector("#app").classList.remove("d-none");
    document.querySelector("#workerView").classList.toggle("d-none", role !== "worker");
    document.querySelector("#managerView").classList.toggle("d-none", role !== "manager");
    document.querySelector("#currentRoleLabel").textContent =
        role === "manager" ? "Gestor da Loja" : "Encarregado de Estoque";
}

export function showLogin() {
    document.querySelector("#app").classList.add("d-none");
    document.querySelector("#loginScreen").classList.remove("d-none");
}

function sortProducts(list) {
    const order = { high: 0, rupture: 1, medium: 2, low: 3 };
    return [...list].sort((a, b) => order[a.severity] - order[b.severity]);
}

function situationText(product) {
    return product.situation === "rupture" ? "Risco de ruptura" : "Perda por validade";
}

function detailedSituationText(product) {
    if (product.situation === "rupture") return "Risco de ruptura";
    return {
        high: "Alto risco de perda por validade",
        medium: "Médio risco de perda por validade",
        low: "Baixo risco de perda por validade"
    }[product.severity];
}

function riskClass(severity) {
    return {
        high: "risk-high",
        medium: "risk-medium",
        low: "risk-low",
        rupture: "risk-rupture"
    }[severity];
}

function statusText(status) {
    return {
        NONE: "Sem recomendação",
        PENDING: "Aguardando gestor",
        APPROVED: "Aprovada",
        REJECTED: "Recusada",
        EXECUTED: "Executada"
    }[status];
}

function statusClass(status) {
    return {
        NONE: "status-none",
        PENDING: "status-pending",
        APPROVED: "status-approved",
        REJECTED: "status-rejected",
        EXECUTED: "status-executed"
    }[status];
}

function getFlow(workflow, productId) {
    return workflow[productId] || { status: "NONE" };
}

export function renderWorker(products, workflow) {
    const flows = Object.values(workflow);

    document.querySelector("#workerUrgent").textContent = products.filter(
        product => product.situation === "validity" && product.severity === "high"
    ).length;

    document.querySelector("#workerRupture").textContent = products.filter(
        product => product.situation === "rupture"
    ).length;

    document.querySelector("#workerPending").textContent = flows.filter(
        flow => flow.status === "PENDING"
    ).length;

    document.querySelector("#workerApproved").textContent = flows.filter(
        flow => flow.status === "APPROVED"
    ).length;

    const table = document.querySelector("#workerProductTable");

    table.innerHTML = sortProducts(products).map(product => {
        const flow = getFlow(workflow, product.id);
        const deadline = product.situation === "rupture"
            ? `Reposição em ${product.nextRestockDays} dias`
            : `Vence em ${product.days} dias`;
        const leftover = product.situation === "rupture" ? "—" : `${product.leftover} un.`;
        const status = product.situation === "rupture"
            ? `<span class="app-badge status-none">Alerta</span>`
            : `<span class="app-badge ${statusClass(flow.status)}">${statusText(flow.status)}</span>`;

        return `
            <tr data-product-id="${product.id}">
                <td>
                    <span class="product-name">${product.name}</span>
                    <span class="product-category">${product.category}</span>
                </td>
                <td><span class="ean-code">${product.ean}</span></td>
                <td>${product.stock} un.</td>
                <td>${deadline}</td>
                <td>${leftover}</td>
                <td><span class="app-badge ${riskClass(product.severity)}">${situationText(product)}</span></td>
                <td>${status}</td>
                <td><span class="open-label">Abrir →</span></td>
            </tr>
        `;
    }).join("");
}

export function renderManager(products, workflow) {
    const validity = products.filter(product => product.situation === "validity");
    const rupture = products.filter(product => product.situation === "rupture");
    const pending = Object.entries(workflow).filter(([, flow]) => flow.status === "PENDING");
    const totalLoss = validity.reduce((total, product) => total + product.estimatedLoss, 0);

    document.querySelector("#managerLoss").textContent = formatMoney(totalLoss);
    document.querySelector("#managerCritical").textContent = validity.filter(
        product => product.severity === "high"
    ).length;
    document.querySelector("#managerRupture").textContent = rupture.length;
    document.querySelector("#managerPending").textContent = pending.length;

    renderApprovals(products, pending);

    const table = document.querySelector("#managerProductTable");

    table.innerHTML = sortProducts(products).map(product => {
        const flow = getFlow(workflow, product.id);
        const deadline = product.situation === "rupture"
            ? `Reposição em ${product.nextRestockDays} dias`
            : `Vence em ${product.days} dias`;
        const leftover = product.situation === "rupture" ? "—" : `${product.leftover} un.`;
        const loss = product.situation === "rupture" ? "—" : formatMoney(product.estimatedLoss);
        const status = product.situation === "rupture"
            ? `<span class="app-badge status-none">Alerta</span>`
            : `<span class="app-badge ${statusClass(flow.status)}">${statusText(flow.status)}</span>`;

        return `
            <tr data-product-id="${product.id}">
                <td>
                    <span class="product-name">${product.name}</span>
                    <span class="product-category">${product.category}</span>
                </td>
                <td><span class="ean-code">${product.ean}</span></td>
                <td>${product.stock} un.</td>
                <td>${deadline}</td>
                <td>${leftover}</td>
                <td>${loss}</td>
                <td><span class="app-badge ${riskClass(product.severity)}">${situationText(product)}</span></td>
                <td>${status}</td>
                <td><span class="open-label">Analisar →</span></td>
            </tr>
        `;
    }).join("");
}

function renderApprovals(products, pending) {
    const container = document.querySelector("#managerApprovalList");

    if (pending.length === 0) {
        container.innerHTML = `
            <div class="border border-secondary-subtle rounded-3 p-4 text-center">
                <strong class="d-block small">Nenhuma recomendação pendente</strong>
                <small class="text-secondary">Solicitações do encarregado aparecerão aqui.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = pending.map(([productId, flow]) => {
        const product = products.find(item => item.id === Number(productId));
        return `
            <div class="approval-item" data-product-id="${productId}">
                <div>
                    <strong class="d-block small">${product.name}</strong>
                    <span class="approval-description">
                        ${flow.recommendation.leftoverBefore} un. de sobra prevista ·
                        ${formatMoney(flow.recommendation.lossBefore)} de perda estimada
                    </span>
                </div>
                <div class="text-md-end">
                    <span class="approval-action">IA: ${actionLabel(flow.recommendation.discount)}</span>
                    <small class="d-block text-secondary mt-1">Revisar ou simular →</small>
                </div>
            </div>
        `;
    }).join("");
}

export function renderProductModal({
    product,
    flow,
    role,
    baselineScenario,
    aiScenario,
    selectedScenario,
    selectedDiscount
}) {
    renderProductHeader(product);
    const body = document.querySelector("#productModalBody");

    if (product.situation === "rupture") {
        body.innerHTML = renderRuptureProduct(product);
        return;
    }

    body.innerHTML =
        renderValidityDetails(product, role) +
        renderRecommendationSection({
            product,
            flow,
            role,
            baselineScenario,
            aiScenario,
            selectedScenario,
            selectedDiscount
        });
}

function renderProductHeader(product) {
    document.querySelector("#productModalHeader").innerHTML = `
        <span class="app-badge ${riskClass(product.severity)}">${detailedSituationText(product)}</span>
        <h2 class="modal-product-title">${product.name}</h2>
        <span class="ean-code">EAN ${product.ean}</span>
    `;
}

function renderValidityDetails(product, role) {
    let html = `
        <section class="detail-section">
            <span class="eyebrow">ESTIMATIVA ATÉ O VENCIMENTO</span>
            <div class="row g-2 mt-1">
                ${detailBox("Estoque atual", `${product.stock} unidades`)}
                ${detailBox("Validade", `${product.expiry} · ${product.days} dias`)}
                ${detailBox("Giro médio", `${product.dailySales} un./dia`)}
                ${detailBox("Venda prevista até o vencimento", `${product.expectedSales} unidades`)}
                ${detailBox("Sobra prevista no vencimento", `${product.leftover} unidades`, "detail-warning")}
                ${detailBox("Categoria", product.category)}
            </div>
        </section>
    `;

    if (role === "manager") {
        html += `
            <section class="detail-section">
                <span class="eyebrow">IMPACTO FINANCEIRO</span>
                <div class="row g-2 mt-1">
                    ${detailBox("Custo unitário", formatMoney(product.cost))}
                    ${detailBox("Preço de venda", formatMoney(product.price))}
                    ${detailBox("Margem unitária", formatMoney(product.margin))}
                    ${detailBox("Perda estimada", formatMoney(product.estimatedLoss), "detail-danger")}
                </div>
            </section>
        `;
    }

    return html;
}

function renderRuptureProduct(product) {
    return `
        <section class="detail-section">
            <span class="eyebrow">ABASTECIMENTO</span>
            <div class="row g-2 mt-1">
                ${detailBox("Estoque atual", `${product.stock} unidades`)}
                ${detailBox("Giro médio", `${product.dailySales} un./dia`)}
                ${detailBox("Cobertura estimada", `${product.coverageDays.toFixed(1)} dias`)}
                ${detailBox("Próxima reposição", `${product.nextRestockDays} dias`)}
                ${detailBox("Período estimado sem estoque", `${product.ruptureGap.toFixed(1)} dias`, "detail-rupture")}
                ${detailBox("Categoria", product.category)}
            </div>
            <div class="alert alert-primary small mt-3 mb-0">
                <strong>Risco de ruptura identificado.</strong><br>
                Neste MVP a ruptura funciona apenas como alerta de abastecimento.
            </div>
        </section>
    `;
}

function detailBox(label, value, extraClass = "") {
    return `
        <div class="col-6 col-md-4">
            <div class="detail-box ${extraClass}">
                <span class="detail-label">${label}</span>
                <strong class="detail-value">${value}</strong>
            </div>
        </div>
    `;
}

function renderRecommendationSection({
    flow,
    role,
    baselineScenario,
    aiScenario,
    selectedScenario,
    selectedDiscount
}) {
    const status = flow.status || "NONE";
    let title = "Analisar possível ação";
    let description = "O produto possui sobra prevista no vencimento.";
    let content = "";
    let actions = "";

    if (status === "NONE") {
        if (role === "worker") {
            description = "Solicite uma análise para que o sistema avalie possíveis ações antes do vencimento.";
            actions = `<button class="btn btn-dark w-100" data-action="request-analysis">Solicitar recomendação</button>`;
        } else {
            description = "Gere uma recomendação automática e depois simule outros descontos antes da decisão.";
            actions = `<button class="btn btn-dark w-100" data-action="generate-recommendation">Gerar recomendação</button>`;
        }
    }

    if (status === "PENDING") {
        title = actionLabel(flow.recommendation.discount);
        description = flow.recommendation.explanation;

        if (role === "manager") {
            content += scenarioCards(baselineScenario, selectedScenario, true);
            content += renderManagerSimulator({
                recommendation: flow.recommendation,
                selectedScenario,
                selectedDiscount
            });
            actions = `
                <div class="d-flex flex-column flex-sm-row justify-content-end gap-2">
                    <button class="btn btn-outline-danger" data-action="reject">Recusar</button>
                    <button class="btn btn-dark" data-action="approve">
                        ${selectedDiscount === 0 ? "Aprovar manter preço" : `Aprovar ${formatDiscount(selectedDiscount)}%`}
                    </button>
                </div>
            `;
        } else {
            content += scenarioCards(baselineScenario, aiScenario, false);
            actions = `<button class="btn btn-outline-secondary w-100" disabled>Aguardando decisão do gestor</button>`;
        }
    }

    if (status === "APPROVED") {
        title = actionLabel(flow.approvedDiscount);
        description = "A ação foi aprovada pelo gestor e está pronta para execução.";
        content += scenarioCards(baselineScenario, flow.approvedScenario, role === "manager");
        content += workflowHistory(flow);

        actions = role === "worker"
            ? `<button class="btn btn-dark w-100" data-action="execute">Marcar ação como executada</button>`
            : `<button class="btn btn-outline-secondary w-100" disabled>Aguardando execução do encarregado</button>`;
    }

    if (status === "REJECTED") {
        title = "Recomendação recusada";
        description = `Motivo: ${flow.rejectReason}.`;
        content += workflowHistory(flow);
        actions = `<button class="btn btn-outline-secondary w-100" data-action="new-analysis">Solicitar nova análise</button>`;
    }

    if (status === "EXECUTED") {
        title = actionLabel(flow.approvedDiscount);
        description = "A ação aprovada pelo gestor foi executada.";
        content += scenarioCards(baselineScenario, flow.approvedScenario, role === "manager");
        content += workflowHistory(flow);
        actions = `<button class="btn btn-outline-success w-100" disabled>✓ Ação executada</button>`;
    }

    return `
        <section class="ai-box">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
                <div>
                    <span class="eyebrow ai-label">RECOMENDAÇÃO INTELIGENTE</span>
                    <h3 class="h6 fw-bold mt-2 mb-0">${title}</h3>
                </div>
                <span class="app-badge ${statusClass(status)}">${statusText(status)}</span>
            </div>

            <p class="small text-secondary">${description}</p>
            ${content}
            <div class="mt-3">${actions}</div>

            <small class="d-block text-secondary mt-3">
                Nesta prova de conceito, as projeções utilizam dados promocionais simulados.
                A recomendação serve apenas como apoio à decisão.
            </small>
        </section>
    `;
}

function scenarioCards(baseline, scenario, showFinancial) {
    if (!scenario) return "";

    let cards = `
        <div class="row g-2 mb-3">
            <div class="col-6 col-md-4">
                <div class="scenario-card">
                    <span>Preço promocional</span>
                    <strong>${formatMoney(scenario.promoPrice)}</strong>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="scenario-card">
                    <span>Sobra prevista</span>
                    <strong>${baseline.leftover} → ${scenario.leftover} un.</strong>
                </div>
            </div>
    `;

    if (showFinancial) {
        cards += `
            <div class="col-6 col-md-4">
                <div class="scenario-card">
                    <span>Perda estimada</span>
                    <strong>${formatMoney(baseline.loss)} → ${formatMoney(scenario.loss)}</strong>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="scenario-card">
                    <span>Margem unitária</span>
                    <strong class="${scenario.promoMargin < 0 ? "negative-margin" : "positive-margin"}">
                        ${formatMoney(scenario.promoMargin)}
                    </strong>
                </div>
            </div>
        `;
    }

    cards += `</div>`;
    return cards;
}

function renderManagerSimulator({ recommendation, selectedScenario, selectedDiscount }) {
    const shortcuts = [0, 10, 20, 30];

    const buttons = shortcuts.map(discount => {
        let classes = "btn btn-outline-secondary discount-button";
        if (discount === recommendation.discount) classes += " discount-recommended";
        if (discount === selectedDiscount) classes += " discount-selected";

        return `
            <button class="${classes}" data-action="set-discount" data-discount="${discount}">
                ${discount === 0 ? "Manter preço" : `${discount}%`}
            </button>
        `;
    }).join("");

    const customValue = shortcuts.includes(Number(selectedDiscount)) ? "" : selectedDiscount;

    const warning = selectedScenario?.belowCost
        ? `
            <div class="alert alert-danger small mt-3 mb-0">
                <strong>⚠ Preço abaixo do custo</strong><br>
                O preço promocional ficará em <strong>${formatMoney(selectedScenario.promoPrice)}</strong>
                e a margem unitária em <strong>${formatMoney(selectedScenario.promoMargin)}</strong>.
            </div>
        `
        : "";

    return `
        <div class="manager-simulator">
            <div class="d-flex flex-column flex-sm-row justify-content-between gap-2">
                <div>
                    <span class="eyebrow">DECISÃO DO GESTOR</span>
                    <h4 class="h6 fw-bold mt-2 mb-0">Simular outra ação</h4>
                </div>
                <span class="app-badge risk-medium align-self-start">IA: ${actionLabel(recommendation.discount)}</span>
            </div>

            <p class="small text-secondary mt-2">
                Você pode aceitar a recomendação ou testar outro percentual antes de aprovar.
            </p>

            <small class="d-block text-secondary fw-semibold mb-2">Atalhos</small>
            <div class="d-flex flex-wrap gap-2">${buttons}</div>

            <hr>

            <label for="customDiscountInput" class="form-label small fw-semibold mb-1">Outro desconto</label>
            <p class="small text-secondary">Digite qualquer valor entre 0% e 90%.</p>

            <div class="d-flex gap-2">
                <div class="input-group custom-percentage">
                    <input
                        id="customDiscountInput"
                        type="number"
                        class="form-control"
                        min="0"
                        max="90"
                        step="1"
                        value="${customValue ?? ""}"
                        placeholder="50"
                    >
                    <span class="input-group-text">%</span>
                </div>
                <button class="btn btn-outline-dark" data-action="simulate-custom">Simular</button>
            </div>

            <div id="discountValidation" class="text-danger small mt-2 d-none">
                Informe um desconto entre 0% e 90%.
            </div>

            <div class="row g-2 mt-3">
                <div class="col-sm-5">
                    <div class="comparison-box">
                        <span>Recomendação da IA</span>
                        <strong>${actionLabel(recommendation.discount)}</strong>
                    </div>
                </div>
                <div class="col-sm-2 d-flex align-items-center justify-content-center text-secondary">→</div>
                <div class="col-sm-5">
                    <div class="comparison-box">
                        <span>Simulação do gestor</span>
                        <strong>${actionLabel(selectedDiscount)}</strong>
                    </div>
                </div>
            </div>

            ${warning}
        </div>
    `;
}

function workflowHistory(flow) {
    let html = `<div class="small text-secondary border-top pt-3 mt-3">`;

    if (flow.requestedBy) {
        html += `<div>Solicitada por <strong>${flow.requestedBy}</strong> · ${flow.requestedAt}</div>`;
    }

    if (flow.decidedAt) {
        html += `<div>Decisão do gestor · ${flow.decidedAt}</div>`;
    }

    if (
        flow.approvedDiscount !== undefined &&
        Number(flow.approvedDiscount) !== Number(flow.recommendation.discount)
    ) {
        html += `
            <div class="text-primary mt-1">
                IA: <strong>${actionLabel(flow.recommendation.discount)}</strong> ·
                Gestor: <strong>${actionLabel(flow.approvedDiscount)}</strong>
            </div>
        `;
    }

    if (flow.executedAt) {
        html += `<div class="text-success mt-1">Executada em ${flow.executedAt}</div>`;
    }

    html += `</div>`;
    return html;
}

export function renderAnalysisModal(product) {
    document.querySelector("#analysisProduct").textContent =
        `${product.name} · ${product.leftover} un. de sobra prevista · vence em ${product.days} dias`;
}

export function showModal(id) {
    const element = document.getElementById(id);
    bootstrap.Modal.getOrCreateInstance(element).show();
}

export function hideModal(id) {
    const element = document.getElementById(id);
    const instance = bootstrap.Modal.getInstance(element);
    if (instance) instance.hide();
}

export function switchModal(fromId, toId) {
    const from = document.getElementById(fromId);
    const instance = bootstrap.Modal.getOrCreateInstance(from);

    if (!from.classList.contains("show")) {
        showModal(toId);
        return;
    }

    from.addEventListener("hidden.bs.modal", () => showModal(toId), { once: true });
    instance.hide();
}
