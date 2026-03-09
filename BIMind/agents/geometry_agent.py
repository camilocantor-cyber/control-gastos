import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.element

class GeometryAgent:
    def __init__(self):
        self.settings = ifcopenshell.geom.settings()
        self.settings.set(self.settings.USE_WORLD_COORDS, True)

    def run(self, model):
        try:
            elements_data = []
            
            # Tipos de elementos a extraer
            element_types = ["IfcWall", "IfcWindow", "IfcDoor", "IfcSlab", "IfcColumn"]
            
            # Colores asignados por tipo
            colors = {
                "IfcWall": 0xcccccc,
                "IfcWindow": 0x00f2fe,
                "IfcDoor": 0xf43f5e,
                "IfcSlab": 0x475569,
                "IfcColumn": 0x94a3b8
            }

            for type_name in element_types:
                elements = model.by_type(type_name)
                for el in elements:
                    try:
                        shape = ifcopenshell.geom.create_shape(self.settings, el)
                        verts = shape.geometry.verts
                        
                        # Obtener bounding box simple: min/max x, y, z
                        xs = [verts[i] for i in range(0, len(verts), 3)]
                        ys = [verts[i+1] for i in range(0, len(verts), 3)]
                        zs = [verts[i+2] for i in range(0, len(verts), 3)]
                        
                        min_x, max_x = min(xs), max(xs)
                        min_y, max_y = min(ys), max(ys)
                        min_z, max_z = min(zs), max(zs)
                        
                        elements_data.append({
                            "id": el.GlobalId,
                            "type": type_name,
                            "color": colors.get(type_name, 0xffffff),
                            "box": {
                                "min": [min_x, min_y, min_z],
                                "max": [max_x, max_y, max_z],
                                "center": [(min_x + max_x)/2, (min_y + max_y)/2, (min_z + max_z)/2],
                                "dims": [max_x - min_x, max_y - min_y, max_z - min_z]
                            }
                        })
                    except:
                        continue # Algunos elementos pueden no tener geometría

            stories = model.by_type("IfcBuildingStorey")
            
            # Calcular envolvente global
            overall_height = 0
            if elements_data:
                max_z = max(el["box"]["max"][2] for el in elements_data)
                min_z = min(el["box"]["min"][2] for el in elements_data)
                overall_height = max_z - min_z

            return {
                "type": "GEOMETRY",
                "elements": elements_data,
                "stories": len(stories) if stories else 1,
                "element_count": len(elements_data),
                "height": round(overall_height, 2)
            }
        except Exception as e:
            print(f"Error en GeometryAgent: {e}")
            return {
                "type": "GEOMETRY",
                "elements": [],
                "stories": 1,
                "error": str(e)
            }
