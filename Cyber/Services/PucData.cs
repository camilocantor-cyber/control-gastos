using System.Collections.Generic;
using Cyber.Models;

namespace Cyber.Services;

public static class PucData
{
    public static List<ChartOfAccount> GetDefaultAccounts()
    {
        return new List<ChartOfAccount>
        {
            new ChartOfAccount { Code = "1", Name = "ACTIVO", AccountType = "ACTIVO", Level = 1, ParentCode = null, Nature = "DEBITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "11", Name = "EFECTIVO Y EQUIVALENTES", AccountType = "ACTIVO", Level = 2, ParentCode = "1", Nature = "DEBITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "1105", Name = "CAJA", AccountType = "ACTIVO", Level = 3, ParentCode = "11", Nature = "DEBITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "110505", Name = "CAJA GENERAL", AccountType = "ACTIVO", Level = 4, ParentCode = "1105", Nature = "DEBITO", AcceptsMovement = true },
            new ChartOfAccount { Code = "1110", Name = "BANCOS", AccountType = "ACTIVO", Level = 3, ParentCode = "11", Nature = "DEBITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "111005", Name = "CUENTA CORRIENTE", AccountType = "ACTIVO", Level = 4, ParentCode = "1110", Nature = "DEBITO", AcceptsMovement = true },
            new ChartOfAccount { Code = "2", Name = "PASIVO", AccountType = "PASIVO", Level = 1, ParentCode = null, Nature = "CREDITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "22", Name = "PROVEEDORES", AccountType = "PASIVO", Level = 2, ParentCode = "2", Nature = "CREDITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "2205", Name = "PROVEEDORES NACIONALES", AccountType = "PASIVO", Level = 3, ParentCode = "22", Nature = "CREDITO", AcceptsMovement = true },
            new ChartOfAccount { Code = "3", Name = "PATRIMONIO", AccountType = "PATRIMONIO", Level = 1, ParentCode = null, Nature = "CREDITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "31", Name = "CAPITAL SOCIAL", AccountType = "PATRIMONIO", Level = 2, ParentCode = "3", Nature = "CREDITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "3105", Name = "CAPITAL SUSCRITO Y PAGADO", AccountType = "PATRIMONIO", Level = 3, ParentCode = "31", Nature = "CREDITO", AcceptsMovement = true },
            new ChartOfAccount { Code = "4", Name = "INGRESOS", AccountType = "INGRESO", Level = 1, ParentCode = null, Nature = "CREDITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "41", Name = "INGRESOS OPERACIONALES", AccountType = "INGRESO", Level = 2, ParentCode = "4", Nature = "CREDITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "4135", Name = "COMERCIO AL POR MAYOR", AccountType = "INGRESO", Level = 3, ParentCode = "41", Nature = "CREDITO", AcceptsMovement = true },
            new ChartOfAccount { Code = "5", Name = "GASTOS", AccountType = "GASTO", Level = 1, ParentCode = null, Nature = "DEBITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "51", Name = "GASTOS ADMINISTRATIVOS", AccountType = "GASTO", Level = 2, ParentCode = "5", Nature = "DEBITO", AcceptsMovement = false },
            new ChartOfAccount { Code = "5105", Name = "GASTOS DE PERSONAL", AccountType = "GASTO", Level = 3, ParentCode = "51", Nature = "DEBITO", AcceptsMovement = true },
            new ChartOfAccount { Code = "5120", Name = "ARRENDAMIENTOS", AccountType = "GASTO", Level = 3, ParentCode = "51", Nature = "DEBITO", AcceptsMovement = true }
        };
    }
}
