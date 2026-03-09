using System;

namespace Cyber.Models;

public class Tercero
{
    public string TercCod { get; set; } = string.Empty; // Código del tercero (NIT/CC) - TERCCOD
    public int? TiptCod { get; set; } // Tipo identificación - TIPTCOD (REQUIRED)
    public string TercNom { get; set; } = string.Empty; // Primer nombre - TERCNOM
    public string? TercApel { get; set; } // Primer apellido - TERCAPEL
    public string? TercNom2 { get; set; } // Segundo nombre - TERCNOM2
    public string? TercApel2 { get; set; } // Segundo apellido - TERCAPEL2
    public DateTime? TercFec { get; set; } // Fecha - TERCFEC
    public string? Mail { get; set; } // Email - MAIL
    public string? Dirccion { get; set; } // Dirección - DIRCCION
    public string? Tlfno { get; set; } // Teléfono - TLFNO
    public int? Cdad { get; set; } // Ciudad - CDAD
    public int? RegiCod { get; set; } // Régimen - REGICOD (REQUIRED)
    public int? TpoTrcro { get; set; } // Tipo Tercero - TPO_TRCRO (REQUIRED)
    public string? CdIntrno { get; set; } // Código Interno - CD_INTRNO
    public int? TercDch { get; set; } // Dígito de chequeo - TERCDCH
    public int? TercFlag { get; set; } // Flag - TERCFLAG
    public int? FlagContr { get; set; } // Flag Contribuyente - FLAG_CONTR
    public int? ActvdadEcnmco { get; set; } // Actividad Económica - ACTVDAD_ECNMCO
    public int? CdEstrctraOrgnzcnal { get; set; } // Estructura Organizacional - CD_ESTRCTRA_ORGNZCNAL
    public int? IdCrgo { get; set; } // ID Cargo - ID_CRGO
    public int? IdFncnrio { get; set; } // ID Funcionario - ID_FNCNRIO
    public string? Fax { get; set; } // Fax - FAX
    public int? CdEstdo { get; set; } // Estado - CD_ESTDO
    public int? CdPais { get; set; } // País - CD_PAIS
    public int? Independiente { get; set; } // Independiente - INDEPENDIENTE
    public string? CntroCsto { get; set; } // Centro de Costo - CNTRO_CSTO
    public int? Declarante { get; set; } // Declarante - DECLARANTE
}
