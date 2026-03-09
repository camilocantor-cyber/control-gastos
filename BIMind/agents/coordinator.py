from agents.lca_agent import LCAAgent
from agents.cost_agent import CostAgent
from agents.water_agent import WaterAgent
from agents.energy_agent import EnergyAgent
from agents.norm_agent import NormAgent
from agents.optimizer_agent import OptimizerAgent
from agents.geometry_agent import GeometryAgent
import ifcopenshell

class CoordinatorAgent:
    def run_all(self, ifc_path):
        model = ifcopenshell.open(ifc_path)
        results = []

        # 0. Geometry (Proportions)
        geo = GeometryAgent()
        geo_result = geo.run(model)
        results.append(geo_result)

        # 1. LCA (CO2)
        lca = LCAAgent()
        lca_result = lca.run(model)
        results.append(lca_result)

        # 2. Cost (LCC)
        cost = CostAgent()
        cost_result = cost.run(lca_result, years=30)
        results.append(cost_result)

        # 3. Water
        water = WaterAgent()
        water_result = water.run(model)
        results.append(water_result)

        # 4. Energy
        energy = EnergyAgent()
        energy_result = energy.run(model)
        results.append(energy_result)

        # 5. Normative
        norm = NormAgent()
        norm_result = norm.run(lca_result, water_result, energy_result)
        results.append(norm_result)

        # 6. Optimization
        optimizer = OptimizerAgent()
        opt_result = optimizer.run(lca_result, cost_result, norm_result)
        results.append(opt_result)

        return results
