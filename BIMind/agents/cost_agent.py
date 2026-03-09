COST_FACTORS = {
    "Concrete": {"cost_m3": 120, "maintenance_rate": 0.02},
    "Steel": {"cost_m3": 800, "maintenance_rate": 0.01},
    "Wood": {"cost_m3": 200, "maintenance_rate": 0.03},
    "Brick": {"cost_m3": 150, "maintenance_rate": 0.015},
    "Unknown": {"cost_m3": 300, "maintenance_rate": 0.02}
}

class CostAgent:
    def run(self, lca_result, years=30):
        materials = lca_result["materials"]
        total_cost = 0
        cost_detail = {}

        for mat, data in materials.items():
            volume = data["volume"]
            factors = self.get_factor(mat)

            initial_cost = volume * factors["cost_m3"]
            maintenance_cost = initial_cost * factors["maintenance_rate"] * years
            total = initial_cost + maintenance_cost

            cost_detail[mat] = {
                "initial_cost": round(initial_cost, 2),
                "maintenance_cost": round(maintenance_cost, 2),
                "total_cost": round(total, 2)
            }

            total_cost += total

        return {
            "type": "LifeCycleCost",
            "years": years,
            "total_cost": round(total_cost, 2),
            "detail": cost_detail
        }

    def get_factor(self, material):
        for key in COST_FACTORS:
            if key.lower() in material.lower():
                return COST_FACTORS[key]
        return COST_FACTORS["Unknown"]
