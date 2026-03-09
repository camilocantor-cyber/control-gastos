using System;
using System.Collections.Generic;

namespace Cyber.Models;

public class AccountingConcept
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ConceptType { get; set; } = string.Empty; // INGRESO, GASTO, ETC.
    public string Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public List<ConceptMapping> Mappings { get; set; } = new List<ConceptMapping>();
}

public class ConceptMapping
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ConceptId { get; set; }
    public string AccountCode { get; set; }
    public string MovementType { get; set; } // DEBITO, CREDITO
    public int Position { get; set; }
    public bool IsMain { get; set; }
    public string Description { get; set; }
}
