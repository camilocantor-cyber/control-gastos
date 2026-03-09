class OptimizerAgent:
    def run(self, lca_result, cost_result, norm_result):
        suggestions = []

        # Regla 1: CO2 alto
        if lca_result["total_co2_kg"] > 200000:
            suggestions.append({
                "problem": "Emisiones altas de carbono",
                "suggestion": "Reemplazar parte del concreto por madera estructural o concreto de baja huella con puzolanas",
                "impact": "Reducción estimada de CO2 ~30%"
            })

        # Regla 2: Costo alto
        if cost_result["total_cost"] > 1000000:
            suggestions.append({
                "problem": "Costo de ciclo de vida elevado",
                "suggestion": "Usar acero reciclado o sistemas prefabricados para reducir el mantenimiento",
                "impact": "Reducción estimada de costo de mantenimiento ~20%"
            })

        # Regla 3: No cumple norma
        if norm_result["global_status"] == "FAIL":
            suggestions.append({
                "problem": "Incumplimiento de normativa ambiental",
                "suggestion": "Mejorar el aislamiento térmico para reducir demanda de energía o instalar paneles solares",
                "impact": "Asegura cumplimiento de límites energéticos"
            })

        return {
            "type": "Optimization",
            "suggestions": suggestions
        }
