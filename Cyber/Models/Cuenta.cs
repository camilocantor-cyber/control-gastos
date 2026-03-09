namespace Cyber.Models;

public class Cuenta
{
    // Campos principales
    public int? CdTpoPuc { get; set; }          // CD_TPO_PUC - Tipo de PUC
    public int Cuencor { get; set; }            // CUENCOR - Código correlativo (PK)
    public int? Cuencla { get; set; }           // CUENCLA - Clase
    public int? Cuengru { get; set; }           // CUENGRU - Grupo
    public int? Cuencue { get; set; }           // CUENCUE - Cuenta
    public int? Cuensub { get; set; }           // CUENSUB - Subcuenta
    public int? Cuenax1 { get; set; }           // CUENAX1 - Auxiliar 1
    public int? Cuenax2 { get; set; }           // CUENAX2 - Auxiliar 2
    public string? Cuennom { get; set; }        // CUENNOM - Nombre de la cuenta
    public int? Cuenfcod { get; set; }          // CUENFCOD - Código de formulario
    public string? Cuensig { get; set; }        // CUENSIG - Signo (D/C)
    public int? Cuendch { get; set; }           // CUENDCH - Dígito de chequeo
    
    // Ajustes
    public string? AjstbleInflcion { get; set; }    // AJSTBLE_INFLCION - Ajustable por inflación
    public int? AjsteCrdto { get; set; }            // AJSTE_CRDTO - Ajuste crédito
    public int? AjsteDbto { get; set; }             // AJSTE_DBTO - Ajuste débito
    public decimal? CmprtmntoFscal { get; set; }    // CMPRTMNTO_FSCAL - Comportamiento fiscal
    
    // Tipos y registros
    public int? Tipfcod { get; set; }           // TIPFCOD - Tipo de formulario
    public int? Regticod { get; set; }          // REGTICOD - Registro tipo
    
    // Controles (Char flags)
    public string? CTrcro { get; set; }         // C_TRCRO - Control tercero
    public string? CAfctble { get; set; }       // C_AFCTBLE - Control afectable
    public string? CChque { get; set; }         // C_CHQUE - Control cheque
    public string? CDcmnto { get; set; }        // C_DCMNTO - Control documento
    public string? CFcha { get; set; }          // C_FCHA - Control fecha
    public string? CCntroCsto { get; set; }     // C_CNTRO_CSTO - Control centro de costo
    
    // Categorías y auxiliares
    public int? Cuencat { get; set; }           // CUENCAT - Categoría
    public int? Crpautm { get; set; }           // CRPAUTM - Corporativo automático
    public int? Cuenax3 { get; set; }           // CUENAX3 - Auxiliar 3
    
    // Homologaciones
    public string? Hmlgcion1 { get; set; }      // HMLGCION_1
    public string? Hmlgcion2 { get; set; }      // HMLGCION_2
    public string? Hmlgcion3 { get; set; }      // HMLGCION_3
    public string? NmbreHmlgcion1 { get; set; } // NMBRE_HMLGCION_1
    public string? NmbreHmlgcion2 { get; set; } // NMBRE_HMLGCION_2
    public string? NmbreHmlgcion3 { get; set; } // NMBRE_HMLGCION_3
    
    // Tipo y cuentas
    public int? TpoCta { get; set; }            // TPO_CTA - Tipo de cuenta
    public DateTime? FchaRgstro { get; set; }   // FCHA_RGSTRO - Fecha de registro
    public string? CBase { get; set; }          // C_BASE - Control base
    public long? NroCuenta { get; set; }        // NRO_CUENTA - Número de cuenta
    public string? NroCuentaNif { get; set; }   // NRO_CUENTA_NIF - Número cuenta NIF
    public string? NmbreCtaNif { get; set; }    // NMBRE_CTA_NIF - Nombre cuenta NIF
}
