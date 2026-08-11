const STORAGE_KEY = "valida_plus_workflow";

export function loadWorkflow() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

export function saveWorkflow(workflow) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
}

export function clearWorkflow() {
    localStorage.removeItem(STORAGE_KEY);
}
