using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using OwnershipService.DTOs;
using OwnershipService.Commands;
using OwnershipService.Queries;
using OwnershipService.Data;

namespace OwnershipService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CoOwnersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<CoOwnersController> _logger;
    private readonly ApplicationDbContext _context;

    public CoOwnersController(IMediator mediator, ILogger<CoOwnersController> logger, ApplicationDbContext context)
    {
        _mediator = mediator;
        _logger = logger;
        _context = context;
    }

    /// <summary>
    /// Get all co-owners
    /// </summary>
    [HttpGet]
    [Authorize] // Temporarily allow any authenticated user to debug
    public async Task<ActionResult<List<CoOwnerDto>>> GetAllCoOwners([FromQuery] bool? isVerified, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var allClaims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
        var userRoles = User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("admin");
        var isStaff = User.IsInRole("Staff") || User.IsInRole("staff");
        
        _logger.LogInformation("[GetAllCoOwners] UserId: {UserId}", userId);
        _logger.LogInformation("[GetAllCoOwners] All Claims: {Claims}", string.Join(", ", allClaims));
        _logger.LogInformation("[GetAllCoOwners] Roles: {Roles}, IsAdmin: {IsAdmin}, IsStaff: {IsStaff}", 
            string.Join(",", userRoles), isAdmin, isStaff);
        _logger.LogInformation("[GetAllCoOwners] Query params: IsVerified={IsVerified}, Page={Page}, PageSize={PageSize}, Search={Search}", 
            isVerified, page, pageSize, search);
        
        // Warn if user doesn't have required role but don't block (for debugging)
        if (!isAdmin && !isStaff)
        {
            _logger.LogWarning("[GetAllCoOwners] User {UserId} does not have Admin or Staff role. Roles: {Roles}", userId, string.Join(",", userRoles));
        }
        
        var query = new GetAllCoOwnersQuery(isVerified, page, pageSize, search);
        var result = await _mediator.Send(query);
        
        _logger.LogInformation("[GetAllCoOwners] Returning {Count} co-owners", result.Count);
        
        return Ok(result);
    }

    /// <summary>
    /// Get co-owner by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<CoOwnerDto>> GetCoOwnerById(Guid id)
    {
        var query = new GetCoOwnerByIdQuery(id);
        var result = await _mediator.Send(query);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    /// <summary>
    /// Get co-owner by User ID
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<CoOwnerDto>> GetCoOwnerByUserId(string userId)
    {
        var query = new GetCoOwnerByUserIdQuery(userId);
        var result = await _mediator.Send(query);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new co-owner
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<CoOwnerDto>> CreateCoOwner([FromBody] CreateCoOwnerDto dto)
    {
        try
        {
            var command = new CreateCoOwnerCommand(dto);
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetCoOwnerById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Internal endpoint for service-to-service calls (e.g., from auth-service during registration)
    /// </summary>
    [HttpPost("internal")]
    [AllowAnonymous] // Allow anonymous for service-to-service calls
    public async Task<ActionResult<CoOwnerDto>> CreateCoOwnerInternal([FromBody] CreateCoOwnerDto dto, [FromServices] IConfiguration configuration)
    {
        try
        {
            // Optional: Add service secret validation for security
            // For now, we'll allow internal calls from localhost/gateway
            var command = new CreateCoOwnerCommand(dto);
            var result = await _mediator.Send(command);
            _logger.LogInformation("Created CoOwner via internal endpoint for user {UserId} ({Email})", dto.UserId, dto.Email);
            return CreatedAtAction(nameof(GetCoOwnerById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Failed to create CoOwner via internal endpoint: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update co-owner information
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<CoOwnerDto>> UpdateCoOwner(Guid id, [FromBody] UpdateCoOwnerDto dto)
    {
        try
        {
            var command = new UpdateCoOwnerCommand(id, dto);
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete co-owner (Admin/Staff)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult> DeleteCoOwner(Guid id)
    {
        var success = await _mediator.Send(new DeleteCoOwnerCommand(id));
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Verify co-owner (Admin/Staff only)
    /// </summary>
    [HttpPost("{id}/verify")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<CoOwnerDto>> VerifyCoOwner(Guid id)
    {
        try
        {
            var command = new VerifyCoOwnerCommand(id);
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sync co-owners from auth service - create CoOwner records for users with CoOwner role
    /// </summary>
    [HttpPost("sync-from-auth")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> SyncCoOwnersFromAuth([FromServices] IHttpClientFactory httpClientFactory, [FromServices] IConfiguration configuration)
    {
        try
        {
            // Use gateway URL to call auth service
            var gatewayUrl = configuration["GatewayUrl"] ?? "http://localhost:8000";
            var httpClient = httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);
            
            // Get token from current request to forward to auth service
            var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
            if (!string.IsNullOrEmpty(token))
            {
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            _logger.LogInformation("[SyncCoOwnersFromAuth] Calling gateway at {GatewayUrl}/api/role/users", gatewayUrl);

            // Get all users from auth service via gateway
            var usersResponse = await httpClient.GetAsync($"{gatewayUrl}/api/role/users?page=1&pageSize=1000");
            if (!usersResponse.IsSuccessStatusCode)
            {
                var errorContent = await usersResponse.Content.ReadAsStringAsync();
                _logger.LogError("[SyncCoOwnersFromAuth] Failed to fetch users: {StatusCode}, {Error}", usersResponse.StatusCode, errorContent);
                return BadRequest(new { message = $"Failed to fetch users from auth service: {usersResponse.StatusCode}", details = errorContent });
            }

            var jsonContent = await usersResponse.Content.ReadAsStringAsync();
            _logger.LogInformation("[SyncCoOwnersFromAuth] Received response: {Content}", jsonContent.Substring(0, Math.Min(500, jsonContent.Length)));

            // Parse response using System.Text.Json
            using var jsonDoc = System.Text.Json.JsonDocument.Parse(jsonContent);
            var root = jsonDoc.RootElement;
            
            // Handle different response formats: { data: { users: [...] } } or { users: [...] } or [...]
            System.Text.Json.JsonElement usersArray;
            if (root.TryGetProperty("data", out var dataProp) && dataProp.TryGetProperty("users", out var usersProp))
            {
                usersArray = usersProp;
            }
            else if (root.TryGetProperty("users", out var directUsersProp))
            {
                usersArray = directUsersProp;
            }
            else if (root.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                usersArray = root;
            }
            else
            {
                return BadRequest(new { message = "Unexpected response format from auth service" });
            }

            var created = 0;
            var skipped = 0;
            var errors = new List<string>();

            foreach (var userElement in usersArray.EnumerateArray())
            {
                try
                {
                    // Handle both string and number IDs
                    string? userId = null;
                    if (userElement.TryGetProperty("id", out var idProp))
                    {
                        if (idProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            userId = idProp.GetString();
                        }
                        else if (idProp.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            userId = idProp.GetInt32().ToString();
                        }
                    }
                    
                    var email = userElement.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null;
                    var firstName = userElement.TryGetProperty("firstName", out var firstNameProp) ? firstNameProp.GetString() : "";
                    var lastName = userElement.TryGetProperty("lastName", out var lastNameProp) ? lastNameProp.GetString() : "";
                    var fullName = $"{firstName} {lastName}".Trim();
                    if (string.IsNullOrEmpty(fullName))
                    {
                        fullName = email ?? "Unknown";
                    }
                    
                    // Check if user has CoOwner role
                    var roles = new List<string>();
                    if (userElement.TryGetProperty("roles", out var rolesProp) && rolesProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        roles = rolesProp.EnumerateArray().Select(r => r.GetString() ?? "").Where(r => !string.IsNullOrEmpty(r)).ToList();
                    }

                    if (!roles.Any(r => r.Equals("CoOwner", StringComparison.OrdinalIgnoreCase)))
                    {
                        continue; // Skip users without CoOwner role
                    }

                    if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(email))
                    {
                        _logger.LogWarning("[SyncCoOwnersFromAuth] Skipping user with missing userId or email: {UserId}, {Email}", userId, email);
                        continue; // Skip invalid users
                    }

                    // Check if co-owner already exists
                    var existingCoOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId || c.Email == email);
                    if (existingCoOwner != null)
                    {
                        skipped++;
                        _logger.LogInformation("[SyncCoOwnersFromAuth] Skipping existing co-owner: {UserId} ({Email})", userId, email);
                        continue;
                    }

                    // Create co-owner
                    var createDto = new CreateCoOwnerDto
                    {
                        UserId = userId,
                        FullName = fullName,
                        Email = email,
                        IdentityCardNumber = $"TEMP-{Guid.NewGuid():N}".Substring(0, 20).ToUpperInvariant(),
                        PhoneNumber = null,
                        Address = null
                    };

                    var command = new CreateCoOwnerCommand(createDto);
                    await _mediator.Send(command);
                    created++;
                    _logger.LogInformation("[SyncCoOwnersFromAuth] Created co-owner for user {UserId} ({Email})", userId, email);
                }
                catch (InvalidOperationException ex)
                {
                    // Already exists - skip
                    skipped++;
                    var email = userElement.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : "unknown";
                    _logger.LogWarning("[SyncCoOwnersFromAuth] Co-owner already exists for user {Email}: {Message}", email, ex.Message);
                }
                catch (Exception ex)
                {
                    var email = userElement.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : "unknown";
                    errors.Add($"Failed to create co-owner for user {email}: {ex.Message}");
                    _logger.LogError(ex, "[SyncCoOwnersFromAuth] Failed to create co-owner for user {Email}", email);
                }
            }

            _logger.LogInformation("[SyncCoOwnersFromAuth] Sync completed: {Created} created, {Skipped} skipped, {Errors} errors", created, skipped, errors.Count);

            return Ok(new
            {
                message = "Sync completed",
                created,
                skipped,
                errors = errors.Count > 0 ? errors : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SyncCoOwnersFromAuth] Failed to sync co-owners from auth service");
            return BadRequest(new { message = ex.Message });
        }
    }
}

