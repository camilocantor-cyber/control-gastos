using System;

namespace Cyber.Models;

public class ChartOfAccount
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string AccountType { get; set; } = string.Empty; // ACTIVO, PASIVO, PATRIMONIO, INGRESO, GASTO, COSTOS
    public int Level { get; set; }
    public string? ParentCode { get; set; }
    public string Nature { get; set; } = "DEBITO"; // DEBITO or CREDITO
    public bool AcceptsMovement { get; set; } = false;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
