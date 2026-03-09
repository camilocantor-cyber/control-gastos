import ifcopenshell
import ifcopenshell.template

def generate_simple_ifc():
    print("BIMind: Generando modelo IFC de prueba...")
    
    # Crear un archivo IFC2x3 vacío
    model = ifcopenshell.file(schema="IFC2x3")
    
    # Crear la estructura básica del proyecto
    project = model.createIfcProject(
        GlobalId=ifcopenshell.guid.new(),
        Name="Proyecto de Prueba BIMind"
    )
    
    # Definir unidades
    model.createIfcUnitAssignment([
        model.createIfcSIUnit(UnitType="LENGTHUNIT", Name="METRE")
    ])
    
    # Crear un sitio y un edificio
    site = model.createIfcSite(GlobalId=ifcopenshell.guid.new(), Name="Sitio de Prueba")
    building = model.createIfcBuilding(GlobalId=ifcopenshell.guid.new(), Name="Edificio MVP")
    
    # Guardar el archivo
    filename = "modelo_prueba.ifc"
    model.write(filename)
    print(f"✅ ¡Listo! Se ha creado el archivo: {filename}")
    print("Ahora puedes subirlo en el dashboard para probar el análisis.")

if __name__ == "__main__":
    generate_simple_ifc()
