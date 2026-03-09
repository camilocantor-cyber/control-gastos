class NormAgent:
    def run(self, lca_result, water_result, energy_result):
        rules = []
        status = "PASS"

        # Regla 1: CO2 máximo permitido
        if lca_result["total_co2_kg"] > 200000:
            rules.append({
                "rule": "CO2 máximo",
                "status": "FAIL",
                "message": "Supera el límite de emisiones permitido (200t)"
            })
            status = "FAIL"
        else:
            rules.append({
                "rule": "CO2 máximo",
                "status": "PASS",
                "message": "Dentro del límite de emisiones"
            })

        # Regla 2: Consumo de agua diario
        if water_result["daily_consumption_m3"] > 20:
            rules.append({
                "rule": "Consumo de agua",
                "status": "FAIL",
                "message": "Consumo diario demasiado alto (>20m3)"
            })
            status = "FAIL"
        else:
            rules.append({
                "rule": "Consumo de agua",
                "status": "PASS",
                "message": "Consumo de agua aceptable"
            })

        # Regla 3: Consumo energético anual
        if energy_result["annual_kwh"] > 50000:
            rules.append({
                "rule": "Energía anual",
                "status": "FAIL",
                "message": "Excede consumo energético permitido (50MWh)"
            })
            status = "FAIL"
        else:
            rules.append({
                "rule": "Energía anual",
                "status": "PASS",
                "message": "Consumo energético aceptable"
            })

        return {
            "type": "NormativeCheck",
            "global_status": status,
            "rules": rules
        }
