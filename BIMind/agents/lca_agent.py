import ifcopenshell

EMISSION_FACTORS = {
    "Concrete": 350,
    "Steel": 7800,
    "Wood": 50,
    "Brick": 250,
    "Unknown": 500
}

class LCAAgent:
    def run(self, model):
        elements = model.by_type("IfcWall") + model.by_type("IfcSlab")
        
        materials = {}
        total_co2 = 0

        for el in elements:
            mat = self.get_material(el)
            vol = self.get_volume(el)

            if mat not in materials:
                materials[mat] = {"volume": 0, "co2": 0}

            materials[mat]["volume"] += vol

        for mat, data in materials.items():
            factor = self.get_factor(mat)
            co2 = data["volume"] * factor
            data["co2"] = co2
            total_co2 += co2

        return {
            "type": "LCA",
            "total_co2_kg": total_co2,
            "materials": materials
        }

    def get_material(self, element):
        try:
            for rel in element.HasAssociations:
                if rel.is_a("IfcRelAssociatesMaterial"):
                    return rel.RelatingMaterial.Name
        except:
            pass
        return "Unknown"

    def get_volume(self, element):
        try:
            reps = element.Representation.Representations
            for r in reps:
                for item in r.Items:
                    if hasattr(item, "Depth"):
                        return float(item.Depth)
        except:
            pass
        return 1

    def get_factor(self, material):
        for key in EMISSION_FACTORS:
            if key.lower() in material.lower():
                return EMISSION_FACTORS[key]
        return EMISSION_FACTORS["Unknown"]
