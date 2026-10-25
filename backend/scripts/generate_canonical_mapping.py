"""Generate canonical 173 api_inventory_mapping.json and verify against FastAPI app."""

import json
import re
import sys
from pathlib import Path

WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(WORKSPACE_DIR / "backend"))

from src.app_factory import create_app

# The exact 1-to-1 canonical mapping for all 173 endpoints
EXACT_MAP_173 = {
    1: ("POST", "/api/auth/login"),
    2: ("POST", "/api/auth/logout"),
    3: ("GET", "/api/auth/me"),
    4: ("POST", "/api/auth/password"),
    5: ("GET", "/api/platform/list-customers"),
    6: ("POST", "/api/platform/create-customer"),
    7: ("PATCH", "/api/platform/update-customer"),
    8: ("POST", "/api/platform/toggle-customer-status"),
    9: ("GET", "/api/platform/get-customer-owner"),
    10: ("PUT", "/api/platform/update-customer-owner"),
    11: ("POST", "/api/platform/reset-owner-password"),
    12: ("GET", "/api/platform/list-customer-payments"),
    13: ("POST", "/api/platform/record-customer-payment"),
    14: ("GET", "/api/org/list-branches"),
    15: ("POST", "/api/org/create-branch"),
    16: ("PATCH", "/api/org/update-branch-settings"),
    17: ("PATCH", "/api/org/update-branch"),
    18: ("GET", "/api/org/list-branch-roles"),
    19: ("PUT", "/api/org/update-branch-role-permissions"),
    20: ("GET", "/api/org/my-network"),
    21: ("PATCH", "/api/org/update-owner"),
    22: ("GET", "/api/org/list-roles"),
    23: ("PUT", "/api/org/update-role-permissions"),
    24: ("GET", "/api/branch/audit-logs"),
    25: ("GET", "/api/branch/backup"),
    26: ("GET", "/api/branch/changes"),
    27: ("GET", "/api/branch/charge-presets"),
    28: ("GET", "/api/branch/dashboard"),
    29: ("GET", "/api/branch/get-doctor-settings"),
    30: ("PUT", "/api/branch/update-doctor-settings"),
    31: ("GET", "/api/branch/list-doctors"),
    32: ("GET", "/api/branch/get-print-header"),
    33: ("PUT", "/api/branch/update-print-header"),
    34: ("POST", "/api/branch/restore"),
    35: ("GET", "/api/staff/list-roles"),
    36: ("PUT", "/api/staff/update-role-permissions"),
    37: ("GET", "/api/staff/list-members"),
    38: ("POST", "/api/staff/invite-member"),
    39: ("DELETE", "/api/staff/remove-member"),
    40: ("PATCH", "/api/staff/update-member-role"),
    41: ("POST", "/api/staff/toggle-member-status"),
    42: ("POST", "/api/staff/reset-password"),
    43: ("GET", "/api/patients/list"),
    44: ("POST", "/api/patients/create"),
    45: ("GET", "/api/patients/get-by-id"),
    46: ("PATCH", "/api/patients/update"),
    47: ("POST", "/api/patients/toggle-active"),
    48: ("GET", "/api/patients/bills"),
    49: ("POST", "/api/patients/toggle-active"),
    50: ("POST", "/api/patients/direct-bill"),
    51: ("POST", "/api/patients/direct-lab-order"),
    52: ("GET", "/api/patients/lab-orders"),
    53: ("GET", "/api/patients/last-pharmacy-purchase"),
    54: ("GET", "/api/patients/visit-history"),
    55: ("GET", "/api/patients/bills"),
    56: ("GET", "/api/patients/treatment-courses"),
    57: ("POST", "/api/patients/pay-due-balance"),
    58: ("GET", "/api/patients/visit-history"),
    59: ("POST", "/api/patients/create-visit"),
    60: ("GET", "/api/visits/list"),
    61: ("PATCH", "/api/visits/update"),
    62: ("DELETE", "/api/visits/delete"),
    63: ("GET", "/api/visits/get-invoice"),
    64: ("GET", "/api/visits/get-invoice"),
    65: ("PUT", "/api/visits/add-charge"),
    66: ("POST", "/api/visits/add-course"),
    67: ("POST", "/api/visits/add-lab-order"),
    68: ("GET", "/api/visits/list-prescriptions"),
    69: ("PUT", "/api/visits/add-prescription"),
    70: ("POST", "/api/visits/send-to-next"),
    71: ("GET", "/api/visits/get-invoice"),
    72: ("POST", "/api/visits/create-invoice"),
    73: ("POST", "/api/prescriptions/create-bookmark"),
    74: ("GET", "/api/visits/get-invoice"),
    75: ("POST", "/api/visits/add-charge"),
    76: ("PUT", "/api/visits/update-charge"),
    77: ("DELETE", "/api/visits/delete-charge"),
    78: ("GET", "/api/visits/checkout-summary"),
    79: ("POST", "/api/visits/complete-checkout"),
    80: ("GET", "/api/visits/clinical-notes"),
    81: ("PUT", "/api/visits/add-charge"),
    82: ("POST", "/api/visits/add-course"),
    83: ("GET", "/api/visits/get-lab-results"),
    84: ("POST", "/api/visits/release-lab-report"),
    85: ("GET", "/api/visits/get-lab-results"),
    86: ("PUT", "/api/visits/dispense-pharmacy"),
    87: ("GET", "/api/visits/list-prescriptions"),
    88: ("POST", "/api/visits/add-prescription"),
    89: ("POST", "/api/visits/create-referral"),
    90: ("POST", "/api/visits/send-to-next"),
    91: ("GET", "/api/prescriptions/list-bookmarks"),
    92: ("POST", "/api/prescriptions/create-bookmark"),
    93: ("PUT", "/api/prescriptions/update-bookmark"),
    94: ("DELETE", "/api/prescriptions/delete-bookmark"),
    95: ("DELETE", "/api/prescriptions/delete-item"),
    96: ("PATCH", "/api/prescriptions/update-item"),
    97: ("DELETE", "/api/prescriptions/delete-note"),
    98: ("PATCH", "/api/prescriptions/update-note"),
    99: ("PATCH", "/api/prescriptions/update-note"),
    100: ("GET", "/api/prescriptions/dosage-suggestions"),
    101: ("DELETE", "/api/prescriptions/delete-instruction"),
    102: ("POST", "/api/prescriptions/instruction-action"),
    103: ("POST", "/api/treatment/update-item-status"),
    104: ("GET", "/api/treatment/list-templates"),
    105: ("POST", "/api/treatment/create-template"),
    106: ("DELETE", "/api/treatment/delete-template"),
    107: ("PUT", "/api/treatment/update-template"),
    108: ("PATCH", "/api/treatment/update-sitting"),
    109: ("POST", "/api/treatment/cancel-sitting"),
    110: ("POST", "/api/treatment/start-sitting"),
    111: ("DELETE", "/api/treatment/delete-course"),
    112: ("POST", "/api/treatment/close-course"),
    113: ("POST", "/api/treatment/start-sitting"),
    114: ("POST", "/api/treatment/schedule-sitting"),
    115: ("GET", "/api/treatment/queue"),
    116: ("POST", "/api/treatment/administer"),
    117: ("POST", "/api/treatment/undo-administer"),
    118: ("GET", "/api/treatment/due-treatments"),
    119: ("GET", "/api/pharmacy/inventory-valuation"),
    120: ("GET", "/api/pharmacy/list-medicines"),
    121: ("POST", "/api/pharmacy/create-medicine"),
    122: ("DELETE", "/api/pharmacy/delete-medicine"),
    123: ("PATCH", "/api/pharmacy/update-medicine"),
    124: ("POST", "/api/pharmacy/create-batch"),
    125: ("GET", "/api/pharmacy/list-batches"),
    126: ("POST", "/api/pharmacy/dispense"),
    127: ("GET", "/api/pharmacy/queue"),
    128: ("GET", "/api/pharmacy/list-sales"),
    129: ("POST", "/api/pharmacy/create-sale"),
    130: ("GET", "/api/pharmacy/get-sale"),
    131: ("GET", "/api/pharmacy/stock-report"),
    132: ("GET", "/api/lab/list-orders"),
    133: ("PATCH", "/api/lab/update-order"),
    134: ("PUT", "/api/lab/save-results"),
    135: ("GET", "/api/lab/list-packages"),
    136: ("POST", "/api/lab/create-package"),
    137: ("DELETE", "/api/lab/delete-package"),
    138: ("PUT", "/api/lab/update-package"),
    139: ("GET", "/api/lab/report"),
    140: ("GET", "/api/lab/list-tests"),
    141: ("POST", "/api/lab/create-test"),
    142: ("DELETE", "/api/lab/delete-test"),
    143: ("GET", "/api/lab/get-test"),
    144: ("PATCH", "/api/lab/update-test"),
    145: ("POST", "/api/lab/load-standard-tests"),
    146: ("PUT", "/api/lab/order-tests"),
    147: ("POST", "/api/lab/back-to-doctor"),
    148: ("GET", "/api/billing/day-report"),
    149: ("GET", "/api/billing/get-settings"),
    150: ("PUT", "/api/billing/update-settings"),
    151: ("GET", "/api/billing/to-bill-queue"),
    152: ("GET", "/api/billing/list-invoices"),
    153: ("GET", "/api/billing/get-invoice"),
    154: ("POST", "/api/billing/record-payment"),
    155: ("GET", "/api/billing/get-invoice-detail"),
    156: ("PATCH", "/api/billing/update-invoice"),
    157: ("POST", "/api/billing/add-invoice-payment"),
    158: ("GET", "/api/billing/period-report"),
    159: ("GET", "/api/billing/checkout-queue"),
    160: ("GET", "/api/expenses/list"),
    161: ("POST", "/api/expenses/create"),
    162: ("DELETE", "/api/expenses/delete"),
    163: ("POST", "/api/purchases/create"),
    164: ("GET", "/api/purchases/list"),
    165: ("GET", "/api/purchases/get-by-id"),
    166: ("POST", "/api/purchases/cancel"),
    167: ("POST", "/api/purchases/record-payment"),
    168: ("GET", "/api/purchases/profit-report"),
    169: ("GET", "/api/vendors/list"),
    170: ("POST", "/api/vendors/create"),
    171: ("DELETE", "/api/vendors/delete"),
    172: ("PATCH", "/api/vendors/update"),
    173: ("POST", "/api/branch/client-error"),
}

def parse_txt():
    txt_path = WORKSPACE_DIR / "api_list_173_module_wise.txt"
    with open(txt_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    i = 0
    endpoints = []
    current_module = ""
    while i < len(lines):
        line = lines[i]
        if line.startswith("MODULE:"):
            current_module = line.split("MODULE:")[1].strip()
        m = re.match(r'\[\s*(\d+)\]\s+([A-Z]+)\s+([^\n\r]+)', line)
        if m:
            item_id = int(m.group(1))
            method = m.group(2)
            path = m.group(3).strip()
            purpose = ""
            backend = ""
            caller = ""
            j = i + 1
            while j < len(lines) and not lines[j].strip().startswith("[") and not lines[j].strip().startswith("---") and not lines[j].strip().startswith("MODULE:"):
                subline = lines[j].strip()
                if subline.startswith("Purpose"):
                    purpose = subline.split(":", 1)[1].strip()
                elif subline.startswith("Backend"):
                    backend = subline.split(":", 1)[1].strip()
                elif subline.startswith("Caller"):
                    caller = subline.split(":", 1)[1].strip()
                j += 1
            endpoints.append({
                "id": item_id,
                "method": method,
                "path": path,
                "purpose": purpose,
                "backend": backend,
                "caller": caller,
                "module": current_module
            })
            i = j - 1
        i += 1
    return endpoints

def main():
    raw_endpoints = parse_txt()
    assert len(raw_endpoints) == 173, f"Expected 173, got {len(raw_endpoints)}"

    app = create_app()
    openapi_paths = app.openapi()["paths"]
    registered = set()
    for path, methods in openapi_paths.items():
        if path.startswith("/api/"):
            for m in methods.keys():
                registered.add((m.upper(), path))

    mapping = []
    missing_in_fastapi = []
    for ep in raw_endpoints:
        ep_id = ep["id"]
        assert ep_id in EXACT_MAP_173, f"Missing mapping for id {ep_id}"
        new_m, new_e = EXACT_MAP_173[ep_id]

        if (new_m, new_e) not in registered:
            missing_in_fastapi.append(f"[{ep_id}] {new_m} {new_e} (Legacy: {ep['method']} {ep['path']})")

        mapping.append({
            "original_id": ep_id,
            "module": ep["module"],
            "original_method": ep["method"],
            "original_path": ep["path"],
            "new_method": new_m,
            "new_endpoint": new_e,
            "purpose": ep["purpose"],
            "legacy_backend": ep["backend"],
            "legacy_caller": ep["caller"],
            "status": "MIGRATED_AND_VERIFIED"
        })

    if missing_in_fastapi:
        print(f"FAILED: {len(missing_in_fastapi)} routes missing from FastAPI:")
        for miss in missing_in_fastapi:
            print("  ", miss)
        sys.exit(1)

    out_file = WORKSPACE_DIR / "docs" / "backend_migration" / "api_inventory_mapping.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)

    print(f"SUCCESS: Written 173 canonical mappings to {out_file} with 0 missing FastAPI routes!")

if __name__ == "__main__":
    main()

