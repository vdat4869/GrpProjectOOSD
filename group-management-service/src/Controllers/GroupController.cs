using GroupManagementService.Models;
using GroupManagementService.Services;
using Microsoft.AspNetCore.Mvc;

namespace GroupManagementService.Controllers
{
    [ApiController]
    [Route("api/groups")]
    public class GroupController : ControllerBase
    {
        private readonly GroupService _service;
        public GroupController(GroupService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllGroupsAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var group = await _service.GetGroupByIdAsync(id);
            return group == null ? NotFound() : Ok(group);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateGroupRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var group = new Group
            {
                Name = request.Name,
                Members = request.Members.Select(m => new Member
                {
                    FullName = m.FullName,
                    IsCoOwner = m.IsCoOwner
                }).ToList()
            };

            var created = await _service.CreateGroupAsync(group);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
    }
}
