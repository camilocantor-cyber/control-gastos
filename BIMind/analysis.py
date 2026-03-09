from agents.coordinator import CoordinatorAgent

def analyze_ifc(path):
    coordinator = CoordinatorAgent()
    results = coordinator.run_all(path)
    return results
