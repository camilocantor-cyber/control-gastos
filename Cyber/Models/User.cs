using System.Text.Json.Serialization;

namespace Cyber.Models;

public class User
{
    // Usamos decimal para compatibilidad directa con NUMBER de Oracle 11g
    public decimal Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
